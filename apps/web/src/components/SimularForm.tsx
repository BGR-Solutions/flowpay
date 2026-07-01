import type { Assunto } from '@flowpay/shared';
import { useState } from 'react';

/**
 * Props do {@link SimularForm}.
 */
export interface SimularFormProps {
  /**
   * Callback chamado ao enviar o formulário.
   *
   * @param dados - Assunto e texto da mensagem simulada.
   */
  onEnviar: (dados: { assunto: Assunto; texto: string }) => void | Promise<void>;
}

/** Opções de assunto apresentadas no formulário. */
const OPCOES: { valor: Assunto; rotulo: string }[] = [
  { valor: 'PROBLEMA_CARTAO', rotulo: 'Problemas com cartão' },
  { valor: 'CONTRATACAO_EMPRESTIMO', rotulo: 'Contratação de empréstimo' },
  { valor: 'OUTRO', rotulo: 'Outros assuntos' },
];

/** Texto padrão por assunto (aciona o classificador do back-end). */
const TEXTO_PADRAO: Record<Assunto, string> = {
  PROBLEMA_CARTAO: 'Estou com um problema no meu cartão',
  CONTRATACAO_EMPRESTIMO: 'Gostaria de contratar um empréstimo',
  OUTRO: 'Tenho uma dúvida geral',
};

/**
 * Formulário para simular a chegada de uma nova solicitação (via canal
 * WhatsApp mock), útil para demonstrar a distribuição em tempo real.
 *
 * @param props - {@link SimularFormProps}.
 * @returns O formulário de simulação.
 */
export function SimularForm({ onEnviar }: SimularFormProps): JSX.Element {
  const [assunto, setAssunto] = useState<Assunto>('PROBLEMA_CARTAO');
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    setEnviando(true);
    try {
      await onEnviar({ assunto, texto: TEXTO_PADRAO[assunto] });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <label className="text-sm text-slate-300" htmlFor="assunto">
        Simular nova solicitação
      </label>
      <select
        id="assunto"
        value={assunto}
        onChange={(e) => setAssunto(e.target.value as Assunto)}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100"
      >
        {OPCOES.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={enviar}
        disabled={enviando}
        className="rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
      >
        {enviando ? 'Enviando…' : 'Enviar'}
      </button>
    </div>
  );
}
