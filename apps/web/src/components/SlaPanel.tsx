import type { SlaDTO } from '@flowpay/shared';

/**
 * Props do {@link SlaPanel}.
 */
export interface SlaPanelProps {
  /** Indicadores de SLA vindos de `GET /dashboard/metricas`. */
  sla: SlaDTO;
  /** Total de atendimentos abandonados na fila. */
  abandonados: number;
}

/**
 * Formata uma duração em segundos de forma compacta (s ou min).
 *
 * @param segundos - Valor em segundos.
 * @returns Texto formatado.
 */
function formatarDuracao(segundos: number): string {
  if (segundos >= 60) return `${(segundos / 60).toFixed(1)} min`;
  return `${segundos.toFixed(0)} s`;
}

/**
 * Item individual de indicador exibido no painel.
 *
 * @param props - Rótulo e valor.
 * @param props.rotulo - Rótulo do indicador.
 * @param props.valor - Valor já formatado.
 * @returns O item renderizado.
 */
function Indicador({ rotulo, valor }: { rotulo: string; valor: string }): JSX.Element {
  return (
    <div className="rounded-lg bg-slate-800/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{rotulo}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{valor}</p>
    </div>
  );
}

/**
 * Painel de indicadores de nível de serviço (SLA) — os KPIs que gestores usam
 * para decisão: percentis de espera e atendimento, tempo de primeira resposta
 * e taxa de abandono da fila.
 *
 * @param props - {@link SlaPanelProps}.
 * @returns O painel de SLA.
 */
export function SlaPanel({ sla, abandonados }: SlaPanelProps): JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Indicadores de SLA</h3>
        <span className="text-xs text-slate-400">{abandonados} abandonos</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Indicador rotulo="Espera p50" valor={formatarDuracao(sla.esperaP50Segundos)} />
        <Indicador rotulo="Espera p95" valor={formatarDuracao(sla.esperaP95Segundos)} />
        <Indicador rotulo="Atend. p50" valor={formatarDuracao(sla.atendimentoP50Segundos)} />
        <Indicador rotulo="Atend. p95" valor={formatarDuracao(sla.atendimentoP95Segundos)} />
        <Indicador
          rotulo="1ª resposta (FRT)"
          valor={formatarDuracao(sla.primeiraRespostaMedioSegundos)}
        />
        <Indicador
          rotulo="Taxa de abandono"
          valor={`${(sla.taxaAbandonoFila * 100).toFixed(0)}%`}
        />
      </div>
    </section>
  );
}
