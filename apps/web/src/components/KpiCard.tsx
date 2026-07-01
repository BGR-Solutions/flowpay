/**
 * Props do {@link KpiCard}.
 */
export interface KpiCardProps {
  /** Rótulo do indicador. */
  titulo: string;
  /** Valor principal exibido. */
  valor: number | string;
  /** Sufixo opcional (ex.: unidade). */
  sufixo?: string;
  /** Cor de destaque (classe Tailwind de texto). */
  destaque?: string;
}

/**
 * Cartão de indicador-chave (KPI) do dashboard.
 *
 * @param props - {@link KpiCardProps}.
 * @returns O cartão de KPI.
 */
export function KpiCard({ titulo, valor, sufixo, destaque = 'text-slate-100' }: KpiCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{titulo}</p>
      <p className={`mt-2 text-3xl font-semibold ${destaque}`}>
        {valor}
        {sufixo ? <span className="ml-1 text-base text-slate-400">{sufixo}</span> : null}
      </p>
    </div>
  );
}
