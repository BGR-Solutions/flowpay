import type { DirecaoMensagem } from '@flowpay/shared';

/**
 * Forma serializável de uma {@link Mensagem}, usada por adaptadores de
 * persistência.
 */
export interface MensagemSnapshot {
  /** Identificador único. */
  id: string;
  /** Atendimento ao qual pertence. */
  atendimentoId: string;
  /** Direção. */
  direcao: DirecaoMensagem;
  /** Conteúdo textual. */
  texto: string;
  /** Instante de criação (ISO 8601). */
  criadoEm: string;
  /** Id externo (ex.: `waMessageId`), se houver. */
  externalId?: string;
}

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

  /**
   * @returns Representação serializável desta mensagem.
   */
  paraSnapshot(): MensagemSnapshot {
    return {
      id: this.id,
      atendimentoId: this.atendimentoId,
      direcao: this.direcao,
      texto: this.texto,
      criadoEm: this.criadoEm.toISOString(),
      externalId: this.externalId,
    };
  }

  /**
   * Reconstrói uma {@link Mensagem} a partir de sua forma serializada.
   *
   * @param s - Snapshot previamente persistido.
   * @returns A mensagem reidratada.
   */
  static restaurar(s: MensagemSnapshot): Mensagem {
    return new Mensagem(s.id, s.atendimentoId, s.direcao, s.texto, new Date(s.criadoEm), s.externalId);
  }
}
