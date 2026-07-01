import type { Clock } from '../domain/ports/clock.js';
import type { IdGenerator } from '../domain/ports/id-generator.js';

/**
 * Relógio controlável para testes determinísticos.
 */
export class FakeClock implements Clock {
  /**
   * @param atual - Instante inicial.
   */
  constructor(private atual: Date = new Date('2025-01-01T00:00:00.000Z')) {}

  /** @inheritDoc */
  now(): Date {
    return new Date(this.atual);
  }

  /**
   * Avança o relógio.
   *
   * @param segundos - Quantidade de segundos a avançar.
   */
  avancarSegundos(segundos: number): void {
    this.atual = new Date(this.atual.getTime() + segundos * 1000);
  }
}

/**
 * Gerador de ids sequenciais e previsíveis para testes.
 */
export class SequentialIdGenerator implements IdGenerator {
  private contador = 0;

  /**
   * @param prefixo - Prefixo aplicado a cada id.
   */
  constructor(private readonly prefixo = 'id') {}

  /** @inheritDoc */
  next(): string {
    this.contador += 1;
    return `${this.prefixo}-${this.contador}`;
  }
}
