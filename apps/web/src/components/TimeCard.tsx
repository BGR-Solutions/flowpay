import type { TipoTime } from '@flowpay/shared';
import type { TimeMetrica } from '../store/selectors.js';
import { AtendenteBar } from './AtendenteBar.js';
import { FilaLista } from './FilaLista.js';

/**
 * Props do {@link TimeCard}.
 */
export interface TimeCardProps {
  /** Métrica derivada do time a exibir. */
  metrica: TimeMetrica;
}

/** Mapeia o tipo do time para uma classe de cor de destaque. */
const CORES: Record<TipoTime, string> = {
  CARTOES: 'text-cartoes',
  EMPRESTIMOS: 'text-emprestimos',
  OUTROS: 'text-outros',
};

/** Mapeia o tipo do time para uma classe de barra de progresso. */
const CORES_BARRA: Record<TipoTime, string> = {
  CARTOES: 'bg-cartoes',
  EMPRESTIMOS: 'bg-emprestimos',
  OUTROS: 'bg-outros',
};

/**
 * Cartão de um time: ocupação, carga por atendente e fila de espera.
 *
 * @param props - {@link TimeCardProps}.
 * @returns O cartão do time.
 */
export function TimeCard({ metrica }: TimeCardProps): JSX.Element {
  const { time, ocupacao, capacidadeTotal, percentualOcupacao, fila, atendentes } = metrica;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <header className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${CORES[time.tipo]}`}>{time.nome}</h3>
        <span className="text-sm text-slate-400">
          {ocupacao}/{capacidadeTotal} vagas
        </span>
      </header>

      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full ${CORES_BARRA[time.tipo]}`}
            style={{ width: `${percentualOcupacao}%` }}
          />
        </div>
        <p className="mt-1 text-right text-xs text-slate-500">{percentualOcupacao}% ocupado</p>
      </div>

      <div className="space-y-2">
        {atendentes.map(({ atendente, carga }) => (
          <AtendenteBar
            key={atendente.id}
            nome={atendente.nome}
            carga={carga}
            capacidade={atendente.capacidadeMax}
          />
        ))}
      </div>

      <div>
        <p className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
          Fila de espera
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-amber-300">{fila.length}</span>
        </p>
        <FilaLista itens={fila} />
      </div>
    </section>
  );
}
