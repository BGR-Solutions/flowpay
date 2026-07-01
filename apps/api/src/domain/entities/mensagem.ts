import type { DirecaoMensagem } from '@flowpay/shared';

/**
 * Mensagem trocada com o cliente no contexto de um atendimento.
 */
export class Mensagem {
  /**
   * @param id - Identificador único.
   * @param atendimentoId - Atendimento ao qual pertence.
   * @param direcao - Recebida (`IN`) ou enviada (`OUT`).
   * @param texto - Conteúdo textual.
   * @param criadoEm - Instante de criação.
   * @param externalId - Id externo (ex.: `waMessageId`), usado para
   * idempotência de webhooks.
   */
  constructor(
    public readonly id: string,
    public readonly atendimentoId: string,
    public readonly direcao: DirecaoMensagem,
    public readonly texto: string,
    public readonly criadoEm: Date,
    public readonly externalId?: string,
  ) {}
}
