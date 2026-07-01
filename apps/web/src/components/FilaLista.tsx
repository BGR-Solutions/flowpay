import type { AtendimentoDTO } from '@flowpay/shared';

/**
 * Props do {@link FilaLista}.
 */
export interface FilaListaProps {
  /** Atendimentos aguardando, em ordem FIFO. */
  itens: AtendimentoDTO[];
}

/**
 * Lista da fila de espera de um time (ordem FIFO), com posição e tempo de
 * espera aproximado.
 *
 * @param props - {@link FilaListaProps}.
 * @returns A lista da fila (ou um estado vazio).
 */
export function FilaLista({ itens }: FilaListaProps): JSX.Element {
  if (itens.length === 0) {
    return <p className="text-xs text-slate-500">Sem fila de espera.</p>;
  }

  return (
    <ol className="space-y-1">
      {itens.map((item, indice) => (
        <li
          key={item.id}
          className="flex items-center justify-between rounded-md bg-slate-800/60 px-2 py-1 text-xs"
        >
          <span className="text-slate-300">
            <span className="mr-2 font-semibold text-amber-300">#{indice + 1}</span>
            {item.clienteNome ?? item.clienteId}
          </span>
          <span className="tabular-nums text-slate-500">{esperaFormatada(item.criadoEm)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Formata o tempo desde a criação como `mm:ss`.
 *
 * @param criadoEm - Timestamp ISO de criação.
 * @returns Tempo de espera formatado.
 */
function esperaFormatada(criadoEm: string): string {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(criadoEm).getTime()) / 1000));
  const min = Math.floor(segundos / 60)
    .toString()
    .padStart(2, '0');
  const seg = (segundos % 60).toString().padStart(2, '0');
  return `${min}:${seg}`;
}
