import type { AtendimentoDTO, MensagemDTO } from '@flowpay/shared';
import { useEffect, useRef, useState } from 'react';

/**
 * Props do {@link ConversaPanel}.
 */
export interface ConversaPanelProps {
  /** Atendimento em foco (fecha o painel quando `null`). */
  atendimento: AtendimentoDTO | null;
  /** Mensagens do atendimento, em ordem cronológica. */
  mensagens: MensagemDTO[];
  /**
   * Envia uma resposta ao cliente.
   *
   * @param texto - Conteúdo a enviar.
   */
  onResponder: (texto: string) => void | Promise<void>;
  /** Fecha o painel. */
  onFechar: () => void;
}

/**
 * Formata o horário de uma mensagem (HH:MM).
 *
 * @param iso - Data em ISO 8601.
 * @returns Horário local abreviado.
 */
function horario(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Painel de conversa de um atendimento: exibe o histórico de mensagens e
 * permite ao atendente responder ao cliente, fechando o ciclo ponta a ponta
 * (dashboard → API → canal).
 *
 * @param props - {@link ConversaPanelProps}.
 * @returns O painel de conversa, ou `null` se nenhum atendimento está em foco.
 */
export function ConversaPanel({
  atendimento,
  mensagens,
  onResponder,
  onFechar,
}: ConversaPanelProps): JSX.Element | null {
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens.length]);

  if (!atendimento) return null;

  const encerrado = atendimento.status === 'FINALIZADO' || atendimento.status === 'ABANDONADO';

  const enviar = async () => {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;
    setEnviando(true);
    try {
      await onResponder(conteudo);
      setTexto('');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <aside
      className="flex h-full w-full flex-col rounded-2xl border border-slate-800 bg-slate-900"
      aria-label={`Conversa com ${atendimento.clienteNome ?? atendimento.clienteId}`}
    >
      <header className="flex items-center justify-between border-b border-slate-800 p-4">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {atendimento.clienteNome ?? atendimento.clienteId}
          </p>
          <p className="text-xs text-slate-400">{atendimento.status}</p>
        </div>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar conversa"
          className="rounded-md px-2 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {mensagens.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma mensagem ainda.</p>
        ) : (
          mensagens.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.direcao === 'OUT' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  m.direcao === 'OUT'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-100'
                }`}
              >
                <p>{m.texto}</p>
                <p className="mt-1 text-right text-[10px] opacity-70">{horario(m.criadoEm)}</p>
              </div>
            </div>
          ))
        )}
        <div ref={fimRef} />
      </div>

      <footer className="border-t border-slate-800 p-4">
        {encerrado ? (
          <p className="text-center text-xs text-slate-500">
            Atendimento encerrado — não é possível responder.
          </p>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void enviar();
              }}
              placeholder="Digite uma resposta…"
              aria-label="Resposta ao cliente"
              className="flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={enviar}
              disabled={enviando || texto.trim().length === 0}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        )}
      </footer>
    </aside>
  );
}
