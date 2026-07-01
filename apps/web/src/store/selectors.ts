import type { AtendenteDTO, AtendimentoDTO, TimeDTO } from '@flowpay/shared';

/** KPIs globais do dashboard. */
export interface KpisGlobais {
  /** Total em atendimento. */
  emAtendimento: number;
  /** Total aguardando. */
  aguardando: number;
  /** Total finalizados (na sessão atual). */
  finalizados: number;
  /** Tempo médio de espera (segundos). */
  tempoMedioEsperaSegundos: number;
}

/** Métricas derivadas de um time. */
export interface TimeMetrica {
  /** Time (roster). */
  time: TimeDTO;
  /** Vagas ocupadas. */
  ocupacao: number;
  /** Capacidade total do time. */
  capacidadeTotal: number;
  /** Percentual de ocupação (0–100). */
  percentualOcupacao: number;
  /** Atendimentos aguardando (ordem FIFO). */
  fila: AtendimentoDTO[];
  /** Carga atual por atendente. */
  atendentes: { atendente: AtendenteDTO; carga: number }[];
}

/**
 * Calcula os KPIs globais a partir do mapa de atendimentos.
 *
 * @param atendimentos - Mapa de atendimentos.
 * @returns KPIs agregados.
 */
export function calcularKpis(atendimentos: Record<string, AtendimentoDTO>): KpisGlobais {
  const valores = Object.values(atendimentos);
  const iniciados = valores
    .filter((a) => a.iniciadoEm)
    .map((a) => (new Date(a.iniciadoEm!).getTime() - new Date(a.criadoEm).getTime()) / 1000);
  const media =
    iniciados.length === 0
      ? 0
      : Math.round((iniciados.reduce((s, v) => s + v, 0) / iniciados.length) * 10) / 10;

  return {
    emAtendimento: valores.filter((a) => a.status === 'EM_ATENDIMENTO').length,
    aguardando: valores.filter((a) => a.status === 'AGUARDANDO').length,
    finalizados: valores.filter((a) => a.status === 'FINALIZADO').length,
    tempoMedioEsperaSegundos: media,
  };
}

/**
 * Deriva as métricas por time (ocupação, fila, carga por atendente) a partir do
 * roster e do mapa de atendimentos.
 *
 * @param times - Roster de times/atendentes.
 * @param atendimentos - Mapa de atendimentos.
 * @returns Métricas por time.
 */
export function calcularMetricasPorTime(
  times: TimeDTO[],
  atendimentos: Record<string, AtendimentoDTO>,
): TimeMetrica[] {
  const valores = Object.values(atendimentos);

  return times.map((time) => {
    const emAtendimentoDoTime = valores.filter(
      (a) => a.timeId === time.id && a.status === 'EM_ATENDIMENTO',
    );
    const fila = valores
      .filter((a) => a.timeId === time.id && a.status === 'AGUARDANDO')
      .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime());

    const capacidadeTotal = time.atendentes.reduce((soma, a) => soma + a.capacidadeMax, 0);
    const ocupacao = emAtendimentoDoTime.length;

    const atendentes = time.atendentes.map((atendente) => ({
      atendente,
      carga: emAtendimentoDoTime.filter((a) => a.atendenteId === atendente.id).length,
    }));

    return {
      time,
      ocupacao,
      capacidadeTotal,
      percentualOcupacao: capacidadeTotal === 0 ? 0 : Math.round((ocupacao / capacidadeTotal) * 100),
      fila,
      atendentes,
    };
  });
}
