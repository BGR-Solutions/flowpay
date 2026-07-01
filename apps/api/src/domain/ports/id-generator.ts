import { randomUUID } from 'node:crypto';

/**
 * Abstração de geração de identificadores únicos.
 *
 * Injetável para permitir ids determinísticos em testes.
 */
export interface IdGenerator {
  /**
   * @returns Um novo identificador único.
   */
  next(): string;
}

/**
 * Implementação padrão baseada em UUID v4.
 */
export class UuidGenerator implements IdGenerator {
  /** @inheritDoc */
  next(): string {
    return randomUUID();
  }
}
