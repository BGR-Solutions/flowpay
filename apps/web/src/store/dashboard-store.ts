import type { AtendimentoDTO, EventoTempoReal, TimeDTO } from '@flowpay/shared';
import { create } from 'zustand';

/** Ponto da série temporal de throughput. */
export interface PontoHistorico {
  /** Rótulo de tempo (HH:MM:SS). */
  horario: string;
  /** Atendimentos em andamento no instante. */
  emAtendimento: number;
  /** Atendimentos aguardando no instante. */
  aguardando: number;
}

/** Máximo de pontos mantidos na série temporal. */
const MAX_HISTORICO = 30;

/**
 * Estado global do dashboard, alimentado em tempo real pelos eventos WebSocket.
 *
 * As métricas por time (ocupação, fila, carga por atendente) são **derivadas**
 * do mapa de atendimentos + roster estático de times, garantindo consistência
 * a cada evento sem depender de novas chamadas REST.
 */
export interface DashboardState {
  /** Indica se o WebSocket está conectado. */
  conectado: boolean;
  /** Roster estático de times/atendentes (nomes, capacidade). */
  times: TimeDTO[];
  /** Atendimentos indexados por id (ativos e finalizados recentes). */
  atendimentos: Record<string, AtendimentoDTO>;
  /** Série temporal para o gráfico de throughput. */
  historico: PontoHistorico[];

  /** Define o estado de conexão. @param valor - Conectado ou não. */
  setConectado: (valor: boolean) => void;
  /** Substitui o roster de times. @param times - Times. */
  setTimes: (times: TimeDTO[]) => void;
  /**
   * Substitui o conjunto de atendimentos (usado no snapshot).
   * @param atendimentos - Lista de atendimentos.
   */
  setAtendimentos: (atendimentos: AtendimentoDTO[]) => void;
  /** Atualiza ou insere um atendimento no mapa global.
   * @param atendimento - Atendimento a persistir no estado.
   */
  atualizarAtendimento: (atendimento: AtendimentoDTO) => void;
  /**
   * Aplica um evento de tempo real ao estado.
   * @param evento - Evento recebido do WebSocket.
   */
  aplicarEvento: (evento: EventoTempoReal) => void;
}

/**
 * Cria um ponto de histórico a partir do mapa de atendimentos atual.
 *
 * @param atendimentos - Mapa de atendimentos.
 * @returns O ponto da série temporal.
 */
function pontoAtual(atendimentos: Record<string, AtendimentoDTO>): PontoHistorico {
  const valores = Object.values(atendimentos);
  return {
    horario: new Date().toLocaleTimeString('pt-BR'),
    emAtendimento: valores.filter((a) => a.status === 'EM_ATENDIMENTO').length,
    aguardando: valores.filter((a) => a.status === 'AGUARDANDO').length,
  };
}

function inserirOuAtualizarAtendimento(
  estado: DashboardState,
  atendimento: AtendimentoDTO,
): Pick<DashboardState, 'atendimentos' | 'historico'> {
  const atendimentos = { ...estado.atendimentos, [atendimento.id]: atendimento };
  const historico = [...estado.historico, pontoAtual(atendimentos)].slice(-MAX_HISTORICO);
  return { atendimentos, historico };
}

/**
 * Hook de acesso ao store do dashboard.
 */
export const useDashboardStore = create<DashboardState>((set) => ({
  conectado: false,
  times: [],
  atendimentos: {},
  historico: [],

  setConectado: (valor) => set({ conectado: valor }),
  setTimes: (times) => set({ times }),
  setAtendimentos: (atendimentos) =>
    set(() => {
      const mapa: Record<string, AtendimentoDTO> = {};
      for (const a of atendimentos) mapa[a.id] = a;
      return { atendimentos: mapa };
    }),

  atualizarAtendimento: (atendimento) =>
    set((estado) => inserirOuAtualizarAtendimento(estado, atendimento)),

  aplicarEvento: (evento) =>
    set((estado) => {
      switch (evento.tipo) {
        case 'SNAPSHOT': {
          const mapa: Record<string, AtendimentoDTO> = {};
          for (const a of evento.payload.atendimentosAtivos) mapa[a.id] = a;
          return { times: evento.payload.times, atendimentos: mapa };
        }
        case 'ATENDIMENTO_CRIADO':
        case 'ATENDIMENTO_ALOCADO':
        case 'ATENDIMENTO_ENFILEIRADO':
        case 'ATENDIMENTO_FINALIZADO':
          return inserirOuAtualizarAtendimento(estado, evento.payload);
        default:
          return {};
      }
    }),
}));
