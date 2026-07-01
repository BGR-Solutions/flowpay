import type {
  Assunto,
  AtendimentoDTO,
  MensagemDTO,
  MetricasDTO,
  TimeDTO,
} from '@flowpay/shared';

/** Prefixo base da API (proxied pelo Vite em desenvolvimento). */
const BASE = '/api';

/**
 * Executa uma requisição JSON tratando erros de forma consistente.
 *
 * @typeParam T - Tipo esperado da resposta.
 * @param caminho - Caminho relativo à base da API.
 * @param init - Opções do `fetch`.
 * @returns O corpo da resposta desserializado.
 * @throws {Error} se a resposta não for bem-sucedida.
 */
async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body === undefined) {
    headers.delete('content-type');
  } else if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers,
  });
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => ({}));
    throw new Error(corpo.message ?? `Erro ${resposta.status}`);
  }
  return resposta.json() as Promise<T>;
}

/**
 * Cliente REST do dashboard FlowPay.
 */
export const api = {
  /** @returns Lista de times com atendentes e filas. */
  listarTimes: () => requisitar<TimeDTO[]>('/times'),

  /** @returns Lista de atendimentos ativos e finalizados. */
  listarAtendimentos: () => requisitar<AtendimentoDTO[]>('/atendimentos'),

  /** @returns Métricas agregadas. */
  metricas: () => requisitar<MetricasDTO>('/dashboard/metricas'),

  /**
   * Cria um atendimento.
   *
   * @param dados - Cliente e assunto.
   * @returns O atendimento criado.
   */
  criarAtendimento: (dados: { clienteId: string; assunto: Assunto; clienteNome?: string }) =>
    requisitar<AtendimentoDTO>('/atendimentos', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),

  /**
   * Finaliza um atendimento.
   *
   * @param id - Id do atendimento.
   * @returns O atendimento finalizado.
   */
  finalizar: (id: string) =>
    requisitar<AtendimentoDTO>(`/atendimentos/${id}/finalizar`, { method: 'PATCH' }),

  /**
   * Responde a um atendimento (mensagem de saída).
   *
   * @param id - Id do atendimento.
   * @param texto - Conteúdo a enviar.
   * @returns A mensagem criada.
   */
  responder: (id: string, texto: string) =>
    requisitar<MensagemDTO>(`/atendimentos/${id}/mensagens`, {
      method: 'POST',
      body: JSON.stringify({ texto }),
    }),

  /**
   * Simula uma mensagem de WhatsApp recebida (canal mock).
   *
   * @param dados - Cliente e texto.
   */
  simularWhatsapp: (dados: { clienteId: string; texto: string; clienteNome?: string }) =>
    requisitar<{ aceito: boolean }>('/simular/whatsapp/mensagem', {
      method: 'POST',
      body: JSON.stringify(dados),
    }),
};
