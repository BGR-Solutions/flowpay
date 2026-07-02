import type { AtendimentoDTO, EventoTempoReal, MensagemDTO, TimeDTO } from '@flowpay/shared';
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
  /** Mensagens por atendimento, em ordem cronológica. */
  mensagens: Record<string, MensagemDTO[]>;
  /** Série temporal para o gráfico de throughput. */
  historico: PontoHistorico[];
  /** Momento da última sincronização ou atualização recebida. */
  ultimaAtualizacao: Date | null;

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
   * Substitui o histórico de mensagens de um atendimento (usado ao abrir o
   * painel de conversa e carregar o detalhe via REST).
   * @param atendimentoId - Id do atendimento.
   * @param mensagens - Mensagens em ordem cronológica.
   */
  setMensagens: (atendimentoId: string, mensagens: MensagemDTO[]) => void;
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
 * Anexa uma mensagem ao histórico do seu atendimento, evitando duplicatas por
 * id (o mesmo evento pode chegar por REST e por WebSocket).
 *
 * @param estado - Estado atual.
 * @param mensagem - Mensagem recebida.
 * @returns O novo mapa de mensagens.
 */
function anexarMensagem(
  estado: DashboardState,
  mensagem: MensagemDTO,
): Pick<DashboardState, 'mensagens'> {
  const atuais = estado.mensagens[mensagem.atendimentoId] ?? [];
  if (atuais.some((m) => m.id === mensagem.id)) {
    return { mensagens: estado.mensagens };
  }
  return {
    mensagens: { ...estado.mensagens, [mensagem.atendimentoId]: [...atuais, mensagem] },
  };
}

/**
 * Hook de acesso ao store do dashboard.
 */
export const useDashboardStore = create<DashboardState>((set) => ({
  conectado: false,
  times: [],
  atendimentos: {},
  mensagens: {},
  historico: [],
  ultimaAtualizacao: null,

  setConectado: (valor) => set({ conectado: valor }),
  setTimes: (times) => set({ times, ultimaAtualizacao: new Date() }),
  setAtendimentos: (atendimentos) =>
    set(() => {
      const mapa: Record<string, AtendimentoDTO> = {};
      for (const a of atendimentos) mapa[a.id] = a;
      return { atendimentos: mapa, ultimaAtualizacao: new Date() };
    }),

  atualizarAtendimento: (atendimento) =>
    set((estado) => ({ ...inserirOuAtualizarAtendimento(estado, atendimento), ultimaAtualizacao: new Date() })),

  setMensagens: (atendimentoId, mensagens) =>
    set((estado) => ({ mensagens: { ...estado.mensagens, [atendimentoId]: mensagens } })),

  aplicarEvento: (evento) =>
    set((estado) => {
      switch (evento.tipo) {
        case 'SNAPSHOT': {
          const mapa: Record<string, AtendimentoDTO> = {};
          for (const a of evento.payload.atendimentosAtivos) mapa[a.id] = a;
          return { times: evento.payload.times, atendimentos: mapa, ultimaAtualizacao: new Date() };
        }
        case 'ATENDIMENTO_CRIADO':
        case 'ATENDIMENTO_ALOCADO':
        case 'ATENDIMENTO_ENFILEIRADO':
        case 'ATENDIMENTO_FINALIZADO':
        case 'ATENDIMENTO_ABANDONADO':
          return { ...inserirOuAtualizarAtendimento(estado, evento.payload), ultimaAtualizacao: new Date() };
        case 'MENSAGEM_RECEBIDA':
        case 'MENSAGEM_ENVIADA':
          return { ...anexarMensagem(estado, evento.payload), ultimaAtualizacao: new Date() };
        default:
          return {};
      }
    }),
}));
