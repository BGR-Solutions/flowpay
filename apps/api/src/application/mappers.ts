import type { AtendenteDTO, AtendimentoDTO, MensagemDTO, TimeDTO } from '@flowpay/shared';
import type { Atendente } from '../domain/entities/atendente.js';
import type { Atendimento } from '../domain/entities/atendimento.js';
import type { Mensagem } from '../domain/entities/mensagem.js';
import type { Time } from '../domain/entities/time.js';

/**
 * Converte uma entidade {@link Atendimento} em seu DTO público.
 *
 * @param a - Atendimento de domínio.
 * @returns DTO serializável.
 */
export function atendimentoParaDTO(a: Atendimento): AtendimentoDTO {
  return {
    id: a.id,
    clienteId: a.clienteId,
    clienteNome: a.clienteNome,
    canal: a.canal,
    assunto: a.assunto,
    timeId: a.timeId,
    status: a.status,
    atendenteId: a.atendenteId,
    criadoEm: a.criadoEm.toISOString(),
    iniciadoEm: a.iniciadoEm?.toISOString(),
    finalizadoEm: a.finalizadoEm?.toISOString(),
    abandonadoEm: a.abandonadoEm?.toISOString(),
    primeiraRespostaEm: a.primeiraRespostaEm?.toISOString(),
  };
}

/**
 * Converte uma entidade {@link Atendente} em seu DTO público.
 *
 * @param a - Atendente de domínio.
 * @returns DTO serializável.
 */
export function atendenteParaDTO(a: Atendente): AtendenteDTO {
  return {
    id: a.id,
    nome: a.nome,
    timeId: a.timeId,
    capacidadeMax: a.capacidadeMax,
    cargaAtual: a.cargaAtual,
    atendimentosAtivos: a.atendimentosAtivos,
  };
}

/**
 * Converte uma entidade {@link Time} (e seus atendentes) em DTO público.
 *
 * @param time - Time de domínio.
 * @param atendentes - Atendentes do time.
 * @returns DTO serializável.
 */
export function timeParaDTO(time: Time, atendentes: Atendente[]): TimeDTO {
  return {
    id: time.id,
    tipo: time.tipo,
    nome: time.nome,
    atendentes: atendentes.map(atendenteParaDTO),
    fila: time.fila,
  };
}

/**
 * Converte uma entidade {@link Mensagem} em seu DTO público.
 *
 * @param m - Mensagem de domínio.
 * @returns DTO serializável.
 */
export function mensagemParaDTO(m: Mensagem): MensagemDTO {
  return {
    id: m.id,
    atendimentoId: m.atendimentoId,
    direcao: m.direcao,
    texto: m.texto,
    criadoEm: m.criadoEm.toISOString(),
  };
}
