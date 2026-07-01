import type { AtendenteDTO, AtendimentoDTO, TimeDTO } from '@flowpay/shared';
import type { TimeMetrica } from '../store/selectors.js';

/**
 * Cria um atendente de exemplo.
 *
 * @param over - Sobrescritas parciais.
 * @returns Um {@link AtendenteDTO}.
 */
export function atendenteFixture(over: Partial<AtendenteDTO> = {}): AtendenteDTO {
  return {
    id: 'at-1',
    nome: 'Ana',
    timeId: 'time-1',
    capacidadeMax: 3,
    cargaAtual: 1,
    atendimentosAtivos: [],
    ...over,
  };
}

/**
 * Cria um atendimento aguardando de exemplo.
 *
 * @param over - Sobrescritas parciais.
 * @returns Um {@link AtendimentoDTO}.
 */
export function atendimentoFixture(over: Partial<AtendimentoDTO> = {}): AtendimentoDTO {
  return {
    id: 'atd-1',
    clienteId: '+5511999990000',
    clienteNome: 'Cliente Exemplo',
    canal: 'WHATSAPP',
    assunto: 'PROBLEMA_CARTAO',
    timeId: 'time-1',
    status: 'AGUARDANDO',
    criadoEm: new Date(Date.now() - 90_000).toISOString(),
    ...over,
  };
}

/**
 * Cria um {@link TimeDTO} de exemplo.
 *
 * @param over - Sobrescritas parciais.
 * @returns Um time.
 */
export function timeFixture(over: Partial<TimeDTO> = {}): TimeDTO {
  return {
    id: 'time-1',
    tipo: 'CARTOES',
    nome: 'Time Cartões',
    atendentes: [
      atendenteFixture({ id: 'at-1', nome: 'Ana' }),
      atendenteFixture({ id: 'at-2', nome: 'Bruno' }),
    ],
    fila: [],
    ...over,
  };
}

/**
 * Cria uma {@link TimeMetrica} de exemplo para as stories do TimeCard.
 *
 * @param over - Sobrescritas parciais.
 * @returns Uma métrica de time.
 */
export function timeMetricaFixture(over: Partial<TimeMetrica> = {}): TimeMetrica {
  const time = timeFixture();
  return {
    time,
    ocupacao: 4,
    capacidadeTotal: 6,
    percentualOcupacao: 67,
    fila: [
      atendimentoFixture({ id: 'f1', clienteNome: 'João' }),
      atendimentoFixture({ id: 'f2', clienteNome: 'Maria' }),
    ],
    atendentes: [
      { atendente: time.atendentes[0]!, carga: 3 },
      { atendente: time.atendentes[1]!, carga: 1 },
    ],
    ...over,
  };
}
