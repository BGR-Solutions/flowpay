import type { ChannelPort, MensagemRecebida } from '../../domain/ports/channel-port.js';
import type { Clock } from '../../domain/ports/clock.js';
import type { IdGenerator } from '../../domain/ports/id-generator.js';

/**
 * Registro de uma mensagem "enviada" pelo mock, útil como *spy* em testes e
 * para visualização no dashboard.
 */
export interface MensagemMockEnviada {
  /** Destinatário. */
  clienteId: string;
  /** Conteúdo enviado. */
  texto: string;
  /** Id externo atribuído. */
  externalId: string;
  /** Instante do envio. */
  enviadoEm: Date;
}

/**
 * Adaptador de canal simulado (mock) que implementa {@link ChannelPort}.
 *
 * Permite exercitar o fluxo ponta a ponta (recebimento -> distribuição ->
 * resposta) sem depender da Meta/Cloud API. O adaptador real de produção seria
 * apenas outra implementação da mesma porta — o núcleo não muda.
 */
export class WhatsAppMockAdapter implements ChannelPort {
  /** @inheritDoc */
  readonly nome = 'MOCK' as const;

  /** Mensagens enviadas, preservadas para inspeção/spy. */
  readonly enviadas: MensagemMockEnviada[] = [];

  /** Handler de entrada registrado pelo núcleo. */
  private handler?: (mensagem: MensagemRecebida) => Promise<void>;

  /**
   * @param ids - Gerador de ids (para `externalId`).
   * @param clock - Relógio injetável.
   */
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  /** @inheritDoc */
  async enviarMensagem(clienteId: string, texto: string): Promise<{ externalId: string }> {
    const externalId = `mock-out-${this.ids.next()}`;
    this.enviadas.push({ clienteId, texto, externalId, enviadoEm: this.clock.now() });
    return { externalId };
  }

  /** @inheritDoc */
  onMensagem(handler: (mensagem: MensagemRecebida) => Promise<void>): void {
    this.handler = handler;
  }

  /**
   * Simula a chegada de uma mensagem do cliente, disparando o handler
   * registrado. Usado pelo endpoint de simulação e pelos testes.
   *
   * @param clienteId - Remetente (ex.: telefone).
   * @param texto - Conteúdo recebido.
   * @param clienteNome - Nome do cliente (opcional).
   * @throws {Error} se nenhum handler foi registrado via {@link onMensagem}.
   */
  async simularEntrada(clienteId: string, texto: string, clienteNome?: string): Promise<void> {
    if (!this.handler) {
      throw new Error('Nenhum handler registrado no WhatsAppMockAdapter.');
    }
    await this.handler({
      externalId: `mock-in-${this.ids.next()}`,
      clienteId,
      clienteNome,
      texto,
      recebidoEm: this.clock.now(),
    });
  }
}
