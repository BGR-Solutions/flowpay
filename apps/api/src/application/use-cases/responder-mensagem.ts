import { Mensagem } from '../../domain/entities/mensagem.js';
import { NaoEncontradoError, RegraNegocioError } from '../../domain/errors.js';
import type { DomainEventPublisher } from '../../domain/events/domain-events.js';
import type { ChannelPort } from '../../domain/ports/channel-port.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';
import type {
  AtendimentoRepository,
  MensagemRepository,
} from '../../domain/ports/repositories.js';

/**
 * Dependências do caso de uso {@link ResponderMensagem}.
 */
export interface ResponderMensagemDeps {
  /** Repositório de atendimentos. */
  atendimentos: AtendimentoRepository;
  /** Repositório de mensagens. */
  mensagens: MensagemRepository;
  /** Canal por onde a resposta é enviada ao cliente. */
  canal: ChannelPort;
  /** Publicador de eventos. */
  eventos: DomainEventPublisher;
  /** Relógio injetável. */
  clock: Clock;
  /** Gerador de ids injetável. */
  ids: IdGenerator;
}

/**
 * Caso de uso: um atendente responde a um atendimento, enviando uma mensagem
 * ao cliente pelo canal de origem.
 */
export class ResponderMensagem {
  /**
   * @param deps - Dependências injetadas.
   */
  constructor(private readonly deps: ResponderMensagemDeps) {}

  /**
   * Envia uma mensagem de saída ao cliente e a persiste no histórico do
   * atendimento.
   *
   * @param atendimentoId - Atendimento alvo.
   * @param texto - Conteúdo a enviar.
   * @returns A mensagem registrada.
   * @throws {@link NaoEncontradoError} se o atendimento não existe.
   * @throws {@link RegraNegocioError} se o atendimento já foi finalizado.
   */
  async executar(atendimentoId: string, texto: string): Promise<Mensagem> {
    const atendimento = await this.deps.atendimentos.buscarPorId(atendimentoId);
    if (!atendimento) {
      throw new NaoEncontradoError('Atendimento', atendimentoId);
    }
    if (atendimento.status === 'FINALIZADO') {
      throw new RegraNegocioError(
        `Não é possível responder a um atendimento finalizado (id ${atendimentoId}).`,
        'ATENDIMENTO_FINALIZADO',
      );
    }

    const { externalId } = await this.deps.canal.enviarMensagem(atendimento.clienteId, texto);

    const mensagem = new Mensagem(
      this.deps.ids.next(),
      atendimento.id,
      'OUT',
      texto,
      this.deps.clock.now(),
      externalId,
    );
    await this.deps.mensagens.salvar(mensagem);
    this.deps.eventos.publicar({ tipo: 'MENSAGEM_ENVIADA', mensagem });

    return mensagem;
  }
}
