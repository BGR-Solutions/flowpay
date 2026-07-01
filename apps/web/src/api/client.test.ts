import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client.js';

describe('api', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('não envia content-type JSON em requisições sem corpo', async () => {
    await api.finalizar('atendimento-1');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/atendimentos/atendimento-1/finalizar',
      expect.objectContaining({ method: 'PATCH' }),
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty('content-type');
  });
});
