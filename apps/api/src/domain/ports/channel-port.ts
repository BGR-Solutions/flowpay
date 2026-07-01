/**
 * Mensagem recebida de um canal externo (ex.: WhatsApp).
 */
export interface MensagemRecebida {
  /** Id externo da mensagem (ex.: `waMessageId`), usado para idempotência. */
  externalId: string;
  /** Identificador do cliente no canal (ex.: `wa_id`/telefone). */
  clienteId: string;
  /** Nome do cliente, quando fornecido pelo canal. */
  clienteNome?: string;
  /** Conteúdo textual recebido. */
  texto: string;
  /** Instante de recebimento. */
  recebidoEm: Date;
}

/**
 * Porta de um canal de comunicação com o cliente.
 *
 * Esta abstração é o que torna o WhatsApp **plugável**: o núcleo depende apenas
 * desta interface, nunca da Meta/Cloud API. Trocar o adaptador mock pelo real é
 * apenas fornecer outra implementação — aplicação direta do princípio de
 * inversão de dependência.
 */
export interface ChannelPort {
  /** Nome do canal, usado para roteamento/telemetria. */
  readonly nome: 'WHATSAPP' | 'MOCK';

  /**
   * Envia uma mensagem ao cliente.
   *
   * @param clienteId - Destinatário (ex.: telefone/`wa_id`).
   * @param texto - Conteúdo a enviar.
   * @returns Id externo atribuído pelo canal à mensagem enviada.
   */
  enviarMensagem(clienteId: string, texto: string): Promise<{ externalId: string }>;

  /**
   * Registra o handler chamado quando o canal recebe uma mensagem do cliente.
   *
   * Inverte o controle: o adaptador empurra eventos para o núcleo, que não
   * conhece webhooks nem HTTP.
   *
   * @param handler - Callback assíncrono de processamento da mensagem.
   */
  onMensagem(handler: (mensagem: MensagemRecebida) => Promise<void>): void;
}
