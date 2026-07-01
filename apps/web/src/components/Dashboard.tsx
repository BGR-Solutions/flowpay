import { useMemo } from 'react';
import { api } from '../api/client.js';
import { useRealtime } from '../hooks/use-realtime.js';
import { useDashboardStore } from '../store/dashboard-store.js';
import { calcularKpis, calcularMetricasPorTime } from '../store/selectors.js';
import { ConnectionBadge } from './ConnectionBadge.js';
import { KpiCard } from './KpiCard.js';
import { SimularForm } from './SimularForm.js';
import { ThroughputChart } from './ThroughputChart.js';
import { TimeCard } from './TimeCard.js';

/**
 * Tela principal do dashboard de acompanhamento em tempo real.
 *
 * Conecta o WebSocket, deriva as métricas do estado global e compõe os
 * componentes de visualização. Toda a renderização reage a eventos de tempo
 * real.
 *
 * @returns A tela do dashboard.
 */
export function Dashboard(): JSX.Element {
  useRealtime();

  const conectado = useDashboardStore((s) => s.conectado);
  const times = useDashboardStore((s) => s.times);
  const atendimentos = useDashboardStore((s) => s.atendimentos);
  const historico = useDashboardStore((s) => s.historico);

  const kpis = useMemo(() => calcularKpis(atendimentos), [atendimentos]);
  const metricasPorTime = useMemo(
    () => calcularMetricasPorTime(times, atendimentos),
    [times, atendimentos],
  );

  const ativos = useMemo(
    () =>
      Object.values(atendimentos)
        .filter((a) => a.status === 'EM_ATENDIMENTO')
        .sort((a, b) => new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime()),
    [atendimentos],
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">FlowPay · Central de Atendimentos</h1>
          <p className="text-sm text-slate-400">Monitoramento de distribuição em tempo real</p>
        </div>
        <ConnectionBadge conectado={conectado} />
      </header>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard titulo="Em atendimento" valor={kpis.emAtendimento} destaque="text-emerald-400" />
        <KpiCard titulo="Aguardando" valor={kpis.aguardando} destaque="text-amber-400" />
        <KpiCard titulo="Finalizados" valor={kpis.finalizados} destaque="text-sky-400" />
        <KpiCard
          titulo="Espera média"
          valor={kpis.tempoMedioEsperaSegundos}
          sufixo="s"
          destaque="text-slate-100"
        />
      </div>

      <div className="mb-6">
        <SimularForm
          onEnviar={async ({ assunto, texto }) => {
            try {
              await api.simularWhatsapp({
                clienteId: `+55${Date.now().toString().slice(-9)}`,
                texto,
              });
            } catch {
              await api.criarAtendimento({ clienteId: `cli-${Date.now()}`, assunto });
            }
          }}
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {metricasPorTime.map((metrica) => (
          <TimeCard key={metrica.time.id} metrica={metrica} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ThroughputChart dados={historico} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-200">Em atendimento</h3>
          <ul className="space-y-2">
            {ativos.length === 0 ? (
              <li className="text-xs text-slate-500">Nenhum atendimento em andamento.</li>
            ) : (
              ativos.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between rounded-md bg-slate-800/60 px-3 py-2 text-sm"
                >
                  <span className="truncate text-slate-300">{a.clienteNome ?? a.clienteId}</span>
                  <button
                    type="button"
                    onClick={() => void api.finalizar(a.id)}
                    className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-200 transition hover:bg-rose-500"
                  >
                    Finalizar
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
