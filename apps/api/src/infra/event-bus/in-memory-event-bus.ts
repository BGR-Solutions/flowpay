import type { DomainEvent, DomainEventPublisher } from '../../domain/events/domain-events.js';

/**
 * Barramento de eventos in-memory (padrão observer).
 *
 * Desacopla quem produz eventos (motor/casos de uso) de quem os consome
 * (gateway WebSocket, logs, canais). Assinantes falhos não interrompem os
 * demais.
 */
export class InMemoryEventBus implements DomainEventPublisher {
  private readonly handlers = new Set<(evento: DomainEvent) => void>();

  /** @inheritDoc */
  publicar(evento: DomainEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(evento);
      } catch {
        // Um assinante com erro não deve impedir os demais de receber o evento.
      }
    }
  }

  /** @inheritDoc */
  assinar(handler: (evento: DomainEvent) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
