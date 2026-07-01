import type { EventoTempoReal } from '@flowpay/shared';
import { atendimentoParaDTO, mensagemParaDTO } from '../../application/mappers.js';
import type { DomainEvent } from '../../domain/events/domain-events.js';

/**
 * Converte um evento de domínio no envelope de tempo real trafegado pelo
 * WebSocket, traduzindo entidades em DTOs serializáveis.
 *
 * @param evento - Evento de domínio.
 * @param emitidoEm - Instante de emissão (default: agora).
 * @returns O evento pronto para envio ao cliente.
 */
export function domainEventParaTempoReal(
  evento: DomainEvent,
  emitidoEm: Date = new Date(),
): EventoTempoReal {
  const base = { emitidoEm: emitidoEm.toISOString() };
  switch (evento.tipo) {
    case 'MENSAGEM_RECEBIDA':
    case 'MENSAGEM_ENVIADA':
      return { ...base, tipo: evento.tipo, payload: mensagemParaDTO(evento.mensagem) };
    default:
      return { ...base, tipo: evento.tipo, payload: atendimentoParaDTO(evento.atendimento) };
  }
}
