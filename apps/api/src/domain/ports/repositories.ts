import type { Atendente } from '../entities/atendente.js';
import type { Atendimento } from '../entities/atendimento.js';
import type { Mensagem } from '../entities/mensagem.js';
import type { Time } from '../entities/time.js';

/**
 * Repositório de times.
 *
 * As operações são assíncronas por design: mesmo a implementação in-memory
 * expõe `Promise`s para que o domínio seja escrito de forma agnóstica ao
 * backing store (in-memory hoje, Postgres/Redis amanhã) — e para que a
 * necessidade de exclusão mútua entre operações `async` fique explícita.
 */
export interface TimeRepository {
  /** @param id - Id do time. @returns O time, ou `undefined`. */
  buscarPorId(id: string): Promise<Time | undefined>;
  /** @param tipo - Tipo do time. @returns O time do tipo, ou `undefined`. */
  buscarPorTipo(tipo: Time['tipo']): Promise<Time | undefined>;
  /** @returns Todos os times. */
  listar(): Promise<Time[]>;
  /** Persiste (cria ou atualiza) um time. @param time - Time a salvar. */
  salvar(time: Time): Promise<void>;
}

/**
 * Repositório de atendentes.
 */
export interface AtendenteRepository {
  /** @param id - Id do atendente. @returns O atendente, ou `undefined`. */
  buscarPorId(id: string): Promise<Atendente | undefined>;
  /** @param timeId - Id do time. @returns Atendentes do time. */
  listarPorTime(timeId: string): Promise<Atendente[]>;
  /** @returns Todos os atendentes. */
  listar(): Promise<Atendente[]>;
  /** Persiste um atendente. @param atendente - Atendente a salvar. */
  salvar(atendente: Atendente): Promise<void>;
}

/**
 * Repositório de atendimentos.
 */
export interface AtendimentoRepository {
  /** @param id - Id do atendimento. @returns O atendimento, ou `undefined`. */
  buscarPorId(id: string): Promise<Atendimento | undefined>;
  /**
   * @param clienteId - Id do cliente.
   * @returns O atendimento ativo (não finalizado) do cliente, ou `undefined`.
   */
  buscarAtivoPorCliente(clienteId: string): Promise<Atendimento | undefined>;
  /** @returns Todos os atendimentos. */
  listar(): Promise<Atendimento[]>;
  /** Persiste um atendimento. @param atendimento - Atendimento a salvar. */
  salvar(atendimento: Atendimento): Promise<void>;
}

/**
 * Repositório de mensagens.
 */
export interface MensagemRepository {
  /** @param atendimentoId - Id do atendimento. @returns Mensagens, em ordem. */
  listarPorAtendimento(atendimentoId: string): Promise<Mensagem[]>;
  /**
   * @param externalId - Id externo (ex.: `waMessageId`).
   * @returns A mensagem correspondente, ou `undefined` (para idempotência).
   */
  buscarPorExternalId(externalId: string): Promise<Mensagem | undefined>;
  /** Persiste uma mensagem. @param mensagem - Mensagem a salvar. */
  salvar(mensagem: Mensagem): Promise<void>;
}
