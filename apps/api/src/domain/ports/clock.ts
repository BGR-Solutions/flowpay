/**
 * Abstração de relógio do sistema.
 *
 * Injetar o tempo (em vez de chamar `new Date()` diretamente) torna o domínio
 * **determinístico e testável**: os testes podem controlar o "agora" e validar
 * métricas de tempo (espera/atendimento) sem flakiness.
 */
export interface Clock {
  /**
   * @returns O instante atual.
   */
  now(): Date;
}

/**
 * Implementação padrão baseada no relógio real do sistema.
 */
export class SystemClock implements Clock {
  /** @inheritDoc */
  now(): Date {
    return new Date();
  }
}
