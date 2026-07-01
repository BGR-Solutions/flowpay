import type { AtendimentoDTO, MensagemDTO, TimeDTO } from './dtos.js';

/**
 * Nomes dos eventos de domínio propagados em tempo real via WebSocket.
 */
export const TIPOS_EVENTO = [
  'ATENDIMENTO_CRIADO',
  'ATENDIMENTO_ALOCADO',
  'ATENDIMENTO_ENFILEIRADO',
  'ATENDIMENTO_FINALIZADO',
  'MENSAGEM_RECEBIDA',
  'MENSAGEM_ENVIADA',
  'SNAPSHOT',
] as const;

/**
 * União literal derivada de {@link TIPOS_EVENTO}.
 */
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/**
 * Estado completo do sistema, enviado ao cliente ao conectar e sempre que
 * houver mudança relevante — permite que o dashboard renderize sem múltiplas
 * chamadas REST.
 */
export interface SnapshotPayload {
  /** Times e seus atendentes/filas. */
  times: TimeDTO[];
  /** Atendimentos atualmente ativos (aguardando ou em atendimento). */
  atendimentosAtivos: AtendimentoDTO[];
}

/**
 * Mapa de payloads por tipo de evento, garantindo tipagem forte no consumo.
 */
export interface EventoPayloadMap {
  ATENDIMENTO_CRIADO: AtendimentoDTO;
  ATENDIMENTO_ALOCADO: AtendimentoDTO;
  ATENDIMENTO_ENFILEIRADO: AtendimentoDTO;
  ATENDIMENTO_FINALIZADO: AtendimentoDTO;
  MENSAGEM_RECEBIDA: MensagemDTO;
  MENSAGEM_ENVIADA: MensagemDTO;
  SNAPSHOT: SnapshotPayload;
}

/**
 * Envelope de um evento de tempo real trafegado pelo WebSocket.
 *
 * Modelado como **união discriminada** por `tipo`, permitindo que o consumidor
 * estreite o formato de `payload` via `switch (evento.tipo)`.
 */
export type EventoTempoReal = {
  [K in TipoEvento]: {
    /** Tipo do evento. */
    tipo: K;
    /** Dados associados ao evento. */
    payload: EventoPayloadMap[K];
    /** Momento de emissão (ISO 8601). */
    emitidoEm: string;
  };
}[TipoEvento];
