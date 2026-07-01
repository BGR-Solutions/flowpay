import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client.js';
import { useDashboardStore } from '../store/dashboard-store.js';
import { Dashboard } from './Dashboard.js';

vi.mock('../hooks/use-realtime.js', () => ({
  useRealtime: () => undefined,
}));

vi.mock('./ConnectionBadge.js', () => ({
  ConnectionBadge: ({ conectado }: { conectado: boolean }) => (
    <div>{conectado ? 'conectado' : 'desconectado'}</div>
  ),
}));

vi.mock('./KpiCard.js', () => ({
  KpiCard: ({ titulo, valor, sufixo }: { titulo: string; valor: number; sufixo?: string }) => (
    <div>
      {titulo}: {valor}
      {sufixo ?? ''}
    </div>
  ),
}));

vi.mock('./SimularForm.js', () => ({
  SimularForm: () => <div />,
}));

vi.mock('./ThroughputChart.js', () => ({
  ThroughputChart: () => <div />,
}));

vi.mock('./TimeCard.js', () => ({
  TimeCard: () => <div />,
}));

describe('Dashboard', () => {
  beforeEach(() => {
    useDashboardStore.setState({
      conectado: true,
      times: [],
      atendimentos: {
        'atendimento-1': {
          id: 'atendimento-1',
          clienteId: 'cli-1',
          clienteNome: 'Maria',
          canal: 'API',
          assunto: 'PROBLEMA_CARTAO',
          timeId: 'time-1',
          status: 'EM_ATENDIMENTO',
          criadoEm: new Date().toISOString(),
        },
      },
      historico: [],
    });
    vi.restoreAllMocks();
  });

  it('atualiza o estado ao finalizar um atendimento pelo botão', async () => {
    vi.spyOn(api, 'finalizar').mockResolvedValue({
      id: 'atendimento-1',
      clienteId: 'cli-1',
      clienteNome: 'Maria',
      canal: 'API',
      assunto: 'PROBLEMA_CARTAO',
      timeId: 'time-1',
      status: 'FINALIZADO',
      criadoEm: new Date().toISOString(),
      finalizadoEm: new Date().toISOString(),
    });

    render(<Dashboard />);
    fireEvent.click(screen.getByRole('button', { name: /finalizar/i }));

    await waitFor(() => {
      expect(useDashboardStore.getState().atendimentos['atendimento-1']?.status).toBe('FINALIZADO');
    });
    expect(screen.queryByText('Maria')).not.toBeInTheDocument();
  });
});
