import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PontoHistorico } from '../store/dashboard-store.js';

/**
 * Props do {@link ThroughputChart}.
 */
export interface ThroughputChartProps {
  /** Série temporal de atendimentos em andamento/aguardando. */
  dados: PontoHistorico[];
}

/**
 * Gráfico de linha da evolução de atendimentos em andamento e aguardando.
 *
 * @param props - {@link ThroughputChartProps}.
 * @returns O gráfico responsivo.
 */
export function ThroughputChart({ dados }: ThroughputChartProps): JSX.Element {
  return (
    <div className="h-64 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">Evolução dos atendimentos</h3>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={dados} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="horario" tick={{ fontSize: 10, fill: '#64748b' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }}
            labelStyle={{ color: '#e2e8f0' }}
          />
          <Line
            type="monotone"
            dataKey="emAtendimento"
            name="Em atendimento"
            stroke="#10b981"
            dot={false}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="aguardando"
            name="Aguardando"
            stroke="#f59e0b"
            dot={false}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
