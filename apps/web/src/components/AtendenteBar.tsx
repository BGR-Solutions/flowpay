/**
 * Props do {@link AtendenteBar}.
 */
export interface AtendenteBarProps {
  /** Nome do atendente. */
  nome: string;
  /** Carga atual (atendimentos ativos). */
  carga: number;
  /** Capacidade máxima. */
  capacidade: number;
}

/**
 * Barra de carga de um atendente (0 até a capacidade máxima).
 *
 * @param props - {@link AtendenteBarProps}.
 * @returns A linha do atendente com a barra de ocupação.
 */
export function AtendenteBar({ nome, carga, capacidade }: AtendenteBarProps): JSX.Element {
  const lotado = carga >= capacidade;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate text-sm text-slate-300" title={nome}>
        {nome}
      </span>
      <div className="flex flex-1 gap-1" role="img" aria-label={`${carga} de ${capacidade}`}>
        {Array.from({ length: capacidade }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 flex-1 rounded-full ${
              i < carga ? (lotado ? 'bg-rose-400' : 'bg-emerald-400') : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-400">
        {carga}/{capacidade}
      </span>
    </div>
  );
}
