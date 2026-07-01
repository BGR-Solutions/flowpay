/**
 * Props do {@link ConnectionBadge}.
 */
export interface ConnectionBadgeProps {
  /** Indica se a conexão em tempo real está ativa. */
  conectado: boolean;
}

/**
 * Selo visual do estado da conexão WebSocket (tempo real).
 *
 * @param props - {@link ConnectionBadgeProps}.
 * @returns O elemento do selo.
 */
export function ConnectionBadge({ conectado }: ConnectionBadgeProps): JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
        conectado ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${conectado ? 'bg-emerald-400' : 'bg-rose-400'}`}
        aria-hidden
      />
      {conectado ? 'Tempo real conectado' : 'Reconectando…'}
    </span>
  );
}
