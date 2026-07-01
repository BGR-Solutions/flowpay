import type { AtendimentoDTO } from '@flowpay/shared';
import { describe, expect, it } from 'vitest';
import { timeFixture } from '../stories/fixtures.js';
import { calcularKpis, calcularMetricasPorTime } from './selectors.js';

function mapa(lista: AtendimentoDTO[]): Record<string, AtendimentoDTO> {
  return Object.fromEntries(lista.map((a) => [a.id, a]));
}

describe('selectors', () => {
  it('calcularKpis conta por status', () => {
    const atendimentos = mapa([
      { ...base('1'), status: 'EM_ATENDIMENTO' },
      { ...base('2'), status: 'AGUARDANDO' },
      { ...base('3'), status: 'FINALIZADO' },
    ]);
    const kpis = calcularKpis(atendimentos);
    expect(kpis.emAtendimento).toBe(1);
    expect(kpis.aguardando).toBe(1);
    expect(kpis.finalizados).toBe(1);
  });

  it('calcularMetricasPorTime deriva ocupação, fila e carga por atendente', () => {
    const time = timeFixture(); // 2 atendentes (at-1, at-2), capacidade 3 cada
    const atendimentos = mapa([
      { ...base('a'), status: 'EM_ATENDIMENTO', atendenteId: 'at-1', timeId: time.id },
      { ...base('b'), status: 'EM_ATENDIMENTO', atendenteId: 'at-1', timeId: time.id },
      { ...base('c'), status: 'AGUARDANDO', timeId: time.id },
    ]);

    const [metrica] = calcularMetricasPorTime([time], atendimentos);
    expect(metrica?.ocupacao).toBe(2);
    expect(metrica?.capacidadeTotal).toBe(6);
    expect(metrica?.percentualOcupacao).toBe(33);
    expect(metrica?.fila).toHaveLength(1);
    expect(metrica?.atendentes.find((a) => a.atendente.id === 'at-1')?.carga).toBe(2);
  });
});

function base(id: string): AtendimentoDTO {
  return {
    id,
    clienteId: `cli-${id}`,
    canal: 'API',
    assunto: 'PROBLEMA_CARTAO',
    timeId: 'time-1',
    status: 'AGUARDANDO',
    criadoEm: new Date().toISOString(),
  };
}
