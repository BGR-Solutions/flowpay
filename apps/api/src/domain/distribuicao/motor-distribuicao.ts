import type { Assunto, Canal } from '@flowpay/shared';
import { resolverTipoTime } from '@flowpay/shared';
import { Mutex } from 'async-mutex';
import type { Atendente } from '../entities/atendente.js';
import { Atendimento } from '../entities/atendimento.js';
import type { Time } from '../entities/time.js';
import { NaoEncontradoError, RegraNegocioError } from '../errors.js';
import type { DomainEventPublisher } from '../events/domain-events.js';
import type { Clock } from '../ports/clock.js';
import type { IdGenerator } from '../ports/id-generator.js';
import type {
  AtendenteRepository,
  AtendimentoRepository,
  TimeRepository,
} from '../ports/repositories.js';

/**
 * Dependências do {@link MotorDistribuicao}.
 */
export interface MotorDistribuicaoDeps {
  /** Repositório de times. */
  times: TimeRepository;
  /** Repositório de atendentes. */
  atendentes: AtendenteRepository;
  /** Repositório de atendimentos. */
  atendimentos: AtendimentoRepository;
  /** Relógio injetável. */
  clock: Clock;
  /** Gerador de ids injetável. */
  ids: IdGenerator;
  /** Publicador de eventos de domínio. */
  eventos: DomainEventPublisher;
}

/**
 * Parâmetros para criação de um atendimento pelo motor.
 */
export interface NovoAtendimento {
  /** Identificador do cliente. */
  clienteId: string;
  /** Nome do cliente (opcional). */
  clienteNome?: string;
  /** Assunto da solicitação. */
  assunto: Assunto;
  /** Canal de origem. */
  canal: Canal;
}

/**
 * Motor de distribuição de atendimentos — o núcleo da solução.
 *
 * Responsabilidades:
 * 1. Rotear a solicitação para o time correto conforme o assunto.
 * 2. Alocar a um atendente com vaga (estratégia *least-loaded*) ou enfileirar
 *    (FIFO) quando o time está lotado.
 * 3. Ao finalizar um atendimento, liberar a vaga e puxar o próximo da fila.
 *
 * ### Concorrência
 * Em Node.js o JavaScript é single-thread, mas os casos de uso são
 * assíncronos: entre dois `await` (I/O de repositório) outra operação pode
 * intercalar e observar estado obsoleto — o suficiente para dois atendimentos
 * disputarem a mesma vaga e violar o limite de 3.
 *
 * Para eliminar essa corrida, toda seção crítica de leitura-modificação-escrita
 * do estado de um time é **serializada por um mutex por time**
 * ({@link MotorDistribuicao.executarComLockDoTime}). Serializar por time (e não
 * globalmente) preserva o paralelismo entre times distintos.
 */
export class MotorDistribuicao {
  /** Um mutex por time, criado sob demanda. */
  private readonly locksPorTime = new Map<string, Mutex>();

  /**
   * @param deps - Dependências injetadas do motor.
   */
  constructor(private readonly deps: MotorDistribuicaoDeps) {}

  /**
   * Cria um atendimento, roteando-o e alocando-o ou enfileirando-o de forma
   * atômica em relação ao time de destino.
   *
   * Idempotência de negócio: um mesmo cliente não pode ter dois atendimentos
   * ativos simultâneos; se já houver um, ele é retornado.
   *
   * @param entrada - Dados do novo atendimento.
   * @returns O atendimento criado (ou o ativo já existente do cliente).
   * @throws {@link NaoEncontradoError} se não há time para o assunto.
   */
  async criarAtendimento(entrada: NovoAtendimento): Promise<Atendimento> {
    const time = await this.resolverTime(entrada.assunto);

    return this.executarComLockDoTime(time.id, async () => {
      const existente = await this.deps.atendimentos.buscarAtivoPorCliente(entrada.clienteId);
      if (existente) {
        return existente;
      }

      const atendimento = new Atendimento({
        id: this.deps.ids.next(),
        clienteId: entrada.clienteId,
        clienteNome: entrada.clienteNome,
        canal: entrada.canal,
        assunto: entrada.assunto,
        timeId: time.id,
        criadoEm: this.deps.clock.now(),
      });
      await this.deps.atendimentos.salvar(atendimento);
      this.deps.eventos.publicar({ tipo: 'ATENDIMENTO_CRIADO', atendimento });

      const atendente = await this.selecionarAtendenteDisponivel(time.id);
      if (atendente) {
        await this.alocar(atendimento, atendente);
      } else {
        time.enfileirar(atendimento.id);
        await this.deps.times.salvar(time);
        this.deps.eventos.publicar({ tipo: 'ATENDIMENTO_ENFILEIRADO', atendimento });
      }

      return atendimento;
    });
  }

  /**
   * Finaliza um atendimento em andamento, libera a vaga do atendente e, se
   * houver fila no time, puxa e aloca o próximo atendimento (FIFO).
   *
   * @param atendimentoId - Id do atendimento a finalizar.
   * @returns O atendimento finalizado.
   * @throws {@link NaoEncontradoError} se o atendimento não existe.
   * @throws {@link RegraNegocioError} se o atendimento não está em atendimento.
   */
  async finalizarAtendimento(atendimentoId: string): Promise<Atendimento> {
    const atendimento = await this.deps.atendimentos.buscarPorId(atendimentoId);
    if (!atendimento) {
      throw new NaoEncontradoError('Atendimento', atendimentoId);
    }
    if (atendimento.status !== 'EM_ATENDIMENTO' || !atendimento.atendenteId) {
      throw new RegraNegocioError(
        `Somente atendimentos em andamento podem ser finalizados (id ${atendimentoId}).`,
        'FINALIZACAO_INVALIDA',
      );
    }

    const atendenteId = atendimento.atendenteId;

    return this.executarComLockDoTime(atendimento.timeId, async () => {
      atendimento.finalizar(this.deps.clock.now());
      await this.deps.atendimentos.salvar(atendimento);

      const atendente = await this.deps.atendentes.buscarPorId(atendenteId);
      if (atendente) {
        atendente.liberar(atendimento.id);
        await this.deps.atendentes.salvar(atendente);
      }
      this.deps.eventos.publicar({ tipo: 'ATENDIMENTO_FINALIZADO', atendimento });

      await this.despacharProximoDaFila(atendimento.timeId, atendente);

      return atendimento;
    });
  }

  /**
   * Resolve o time responsável por um assunto.
   *
   * @param assunto - Assunto da solicitação.
   * @returns O time correspondente.
   * @throws {@link NaoEncontradoError} se o time do tipo não existe.
   */
  private async resolverTime(assunto: Assunto): Promise<Time> {
    const tipo = resolverTipoTime(assunto);
    const time = await this.deps.times.buscarPorTipo(tipo);
    if (!time) {
      throw new NaoEncontradoError('Time', tipo);
    }
    return time;
  }

  /**
   * Seleciona o atendente disponível de menor carga (estratégia
   * *least-loaded*), com desempate estável por id para tornar a escolha
   * determinística e testável.
   *
   * @param timeId - Time no qual procurar.
   * @returns Um atendente com vaga, ou `undefined` se todos estão lotados.
   */
  private async selecionarAtendenteDisponivel(timeId: string): Promise<Atendente | undefined> {
    const atendentes = await this.deps.atendentes.listarPorTime(timeId);
    return atendentes
      .filter((a) => a.temVaga())
      .sort((a, b) => a.cargaAtual - b.cargaAtual || a.id.localeCompare(b.id))
      .at(0);
  }

  /**
   * Efetiva a alocação de um atendimento a um atendente e persiste ambos.
   *
   * @param atendimento - Atendimento a alocar.
   * @param atendente - Atendente que receberá o atendimento.
   */
  private async alocar(atendimento: Atendimento, atendente: Atendente): Promise<void> {
    atendente.alocar(atendimento.id);
    atendimento.iniciar(atendente.id, this.deps.clock.now());
    await this.deps.atendentes.salvar(atendente);
    await this.deps.atendimentos.salvar(atendimento);
    this.deps.eventos.publicar({ tipo: 'ATENDIMENTO_ALOCADO', atendimento });
  }

  /**
   * Puxa o próximo atendimento da fila do time e o aloca ao atendente que
   * acabou de liberar uma vaga.
   *
   * @param timeId - Time cujo próximo item da fila será despachado.
   * @param atendente - Atendente recém-liberado (candidato à alocação).
   */
  private async despacharProximoDaFila(
    timeId: string,
    atendente: Atendente | undefined,
  ): Promise<void> {
    if (!atendente || !atendente.temVaga()) return;

    const time = await this.deps.times.buscarPorId(timeId);
    if (!time || time.filaVazia()) return;

    const proximoId = time.desenfileirar();
    await this.deps.times.salvar(time);
    if (!proximoId) return;

    const proximo = await this.deps.atendimentos.buscarPorId(proximoId);
    if (!proximo) return;

    await this.alocar(proximo, atendente);
  }

  /**
   * Executa `fn` com exclusão mútua sobre o estado do time indicado,
   * garantindo atomicidade da seção crítica de distribuição.
   *
   * @typeParam T - Tipo de retorno de `fn`.
   * @param timeId - Time cujo lock deve ser adquirido.
   * @param fn - Seção crítica a executar.
   * @returns O resultado de `fn`.
   */
  private executarComLockDoTime<T>(timeId: string, fn: () => Promise<T>): Promise<T> {
    let lock = this.locksPorTime.get(timeId);
    if (!lock) {
      lock = new Mutex();
      this.locksPorTime.set(timeId, lock);
    }
    return lock.runExclusive(fn);
  }
}
