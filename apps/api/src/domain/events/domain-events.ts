import type { Atendimento } from '../entities/atendimento.js';
import type { Mensagem } from '../entities/mensagem.js';

/**
 * Evento de domínio emitido pelo motor de distribuição e pelos casos de uso.
 *
 * O domínio publica eventos sem conhecer o transporte (WebSocket, logs,
 * métricas). Assim o núcleo permanece desacoplado da camada de entrega.
 */
export type DomainEvent =
  | { tipo: 'ATENDIMENTO_CRIADO'; atendimento: Atendimento }
  | { tipo: 'ATENDIMENTO_ALOCADO'; atendimento: Atendimento }
  | { tipo: 'ATENDIMENTO_ENFILEIRADO'; atendimento: Atendimento }
  | { tipo: 'ATENDIMENTO_FINALIZADO'; atendimento: Atendimento }
  | { tipo: 'MENSAGEM_RECEBIDA'; mensagem: Mensagem }
  | { tipo: 'MENSAGEM_ENVIADA'; mensagem: Mensagem };

/**
 * Porta para publicação de eventos de domínio.
 */
export interface DomainEventPublisher {
  /**
   * Publica um evento para todos os assinantes.
   *
   * @param evento - Evento de domínio a publicar.
   */
  publicar(evento: DomainEvent): void;

  /**
   * Registra um assinante.
   *
   * @param handler - Função chamada a cada evento publicado.
   * @returns Função para cancelar a assinatura.
   */
  assinar(handler: (evento: DomainEvent) => void): () => void;
}
