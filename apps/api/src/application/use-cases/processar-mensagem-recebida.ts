import type { MotorDistribuicao } from '../../domain/distribuicao/motor-distribuicao.js';
import type { Atendimento } from '../../domain/entities/atendimento.js';
import { Mensagem } from '../../domain/entities/mensagem.js';
import type { DomainEventPublisher } from '../../domain/events/domain-events.js';
import type { ChannelPort, MensagemRecebida } from '../../domain/ports/channel-port.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type {
  AtendimentoRepository,
  MensagemRepository,
  TimeRepository,
} from '../../domain/ports/repositories.js';
import { classificarAssunto } from '../assunto-classifier.js';

/**
 * Dependências do caso de uso {@link ProcessarMensagemRecebida}.
 */
export interface ProcessarMensagemRecebidaDeps {
  /** Motor de distribuição. */
  motor: MotorDistribuicao;
  /** Repositório de atendimentos. */
  atendimentos: AtendimentoRepository;
  /** Repositório de mensagens. */
  mensagens: MensagemRepository;
  /** Repositório de times (para calcular posição na fila). */
  times: TimeRepository;
  /** Canal por onde enviar avisos automáticos. */
  canal: ChannelPort;
  /** Publicador de eventos. */
  eventos: DomainEventPublisher;
  /** Gerador de ids. */
  ids: IdGenerator;
}

/**
 * Caso de uso: processa uma mensagem recebida de um canal externo.
 *
 * Fluxo:
 * 1. Idempotência por `externalId` (webhooks podem reenviar).
 * 2. Reidrata o atendimento ativo do cliente ou cria um novo (classificando o
 *    assunto pelo texto).
 * 3. Persiste a mensagem de entrada e publica o evento.
 * 4. Envia um aviso automático de status (alocado ou posição na fila).
 */
export class ProcessarMensagemRecebida {
  /**
   * @param deps - Dependências injetadas.
   */
  constructor(private readonly deps: ProcessarMensagemRecebidaDeps) {}

  /**
   * @param entrada - Mensagem recebida do canal.
   * @returns O atendimento associado à mensagem.
   */
  async executar(entrada: MensagemRecebida): Promise<Atendimento> {
    const jaProcessada = await this.deps.mensagens.buscarPorExternalId(entrada.externalId);
    if (jaProcessada) {
      const atendimento = await this.deps.atendimentos.buscarPorId(jaProcessada.atendimentoId);
      if (atendimento) return atendimento;
    }

    const ativo = await this.deps.atendimentos.buscarAtivoPorCliente(entrada.clienteId);
    const novo = !ativo;

    const atendimento =
      ativo ??
      (await this.deps.motor.criarAtendimento({
        clienteId: entrada.clienteId,
        clienteNome: entrada.clienteNome,
        assunto: classificarAssunto(entrada.texto),
        canal: 'WHATSAPP',
      }));

    const mensagem = new Mensagem(
      this.deps.ids.next(),
      atendimento.id,
      'IN',
      entrada.texto,
      entrada.recebidoEm,
      entrada.externalId,
    );
    await this.deps.mensagens.salvar(mensagem);
    this.deps.eventos.publicar({ tipo: 'MENSAGEM_RECEBIDA', mensagem });

    if (novo) {
      await this.enviarAvisoStatus(atendimento);
    }

    return atendimento;
  }

  /**
   * Envia ao cliente um aviso automático informando alocação ou posição na
   * fila.
   *
   * @param atendimento - Atendimento recém-criado.
   */
  private async enviarAvisoStatus(atendimento: Atendimento): Promise<void> {
    if (atendimento.status === 'EM_ATENDIMENTO') {
      await this.deps.canal.enviarMensagem(
        atendimento.clienteId,
        'Recebemos sua solicitação e um de nossos atendentes já está com você.',
      );
      return;
    }

    const time = await this.deps.times.buscarPorId(atendimento.timeId);
    const posicao = time ? time.fila.indexOf(atendimento.id) + 1 : 0;
    await this.deps.canal.enviarMensagem(
      atendimento.clienteId,
      `Todos os atendentes estão ocupados. Você está na fila (posição ${posicao}) e será atendido em breve.`,
    );
  }
}
