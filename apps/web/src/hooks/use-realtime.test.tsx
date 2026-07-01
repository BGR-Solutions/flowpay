import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimeDTO } from '@flowpay/shared';
import { api } from '../api/client.js';
import { useDashboardStore } from '../store/dashboard-store.js';
import { useRealtime } from './use-realtime.js';

class MockWebSocket {
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public close = vi.fn();

  constructor(public readonly url: string) {}
}

describe('useRealtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('WebSocket', MockWebSocket as unknown as typeof WebSocket);
    useDashboardStore.setState({
      conectado: false,
      times: [],
      atendimentos: {},
      historico: [],
      ultimaAtualizacao: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sincroniza o dashboard periodicamente com a API', async () => {
    const atendimento = {
      id: 'atendimento-1',
      clienteId: 'cli-1',
      clienteNome: 'Maria',
      canal: 'API',
      assunto: 'PROBLEMA_CARTAO',
      timeId: 'time-1',
      status: 'EM_ATENDIMENTO',
      criadoEm: new Date().toISOString(),
    } as const;
    const time: TimeDTO = {
      id: 'time-1',
      tipo: 'CARTOES',
      nome: 'Suporte',
      atendentes: [],
      fila: [],
    };

    vi.spyOn(api, 'listarAtendimentos').mockResolvedValue([atendimento]);
    vi.spyOn(api, 'listarTimes').mockResolvedValue([time]);

    renderHook(() => useRealtime());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(api.listarAtendimentos).toHaveBeenCalled();
    expect(api.listarTimes).toHaveBeenCalled();
    expect(useDashboardStore.getState().atendimentos[atendimento.id]).toEqual(atendimento);
    expect(useDashboardStore.getState().times).toEqual([time]);
    expect(useDashboardStore.getState().ultimaAtualizacao).toBeTruthy();
  });
});
