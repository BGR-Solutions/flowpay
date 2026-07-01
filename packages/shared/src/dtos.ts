import type {
  Assunto,
  Canal,
  DirecaoMensagem,
  StatusAtendimento,
  TipoTime,
} from './enums.js';

/**
 * Representação de uma mensagem trocada com o cliente, exposta pela API.
 */
export interface MensagemDTO {
  /** Identificador único da mensagem. */
  id: string;
  /** Atendimento ao qual a mensagem pertence. */
  atendimentoId: string;
  /** Direção da mensagem (recebida ou enviada). */
  direcao: DirecaoMensagem;
  /** Conteúdo textual. */
  texto: string;
  /** Momento de criação em ISO 8601. */
  criadoEm: string;
}

/**
 * Representação de um atendimento exposta pela API.
 */
export interface AtendimentoDTO {
  /** Identificador único do atendimento. */
  id: string;
  /** Identificador do cliente (ex.: `wa_id`/telefone ou id interno). */
  clienteId: string;
  /** Nome de exibição do cliente, quando conhecido. */
  clienteNome?: string;
  /** Canal de origem. */
  canal: Canal;
  /** Assunto informado pelo cliente. */
  assunto: Assunto;
  /** Time responsável, derivado do assunto. */
  timeId: string;
  /** Estado atual. */
  status: StatusAtendimento;
  /** Atendente responsável, quando em atendimento. */
  atendenteId?: string;
  /** Momento de criação (ISO 8601). */
  criadoEm: string;
  /** Momento em que passou a ser atendido (ISO 8601). */
  iniciadoEm?: string;
  /** Momento de finalização (ISO 8601). */
  finalizadoEm?: string;
}

/**
 * Representação de um atendente, incluindo carga atual.
 */
export interface AtendenteDTO {
  /** Identificador único do atendente. */
  id: string;
  /** Nome de exibição. */
  nome: string;
  /** Time ao qual pertence. */
  timeId: string;
  /** Capacidade máxima de atendimentos simultâneos (regra: 3). */
  capacidadeMax: number;
  /** Quantidade de atendimentos ativos no momento. */
  cargaAtual: number;
  /** Ids dos atendimentos ativos. */
  atendimentosAtivos: string[];
}

/**
 * Representação de um time, com atendentes e tamanho de fila.
 */
export interface TimeDTO {
  /** Identificador único do time. */
  id: string;
  /** Tipo/categoria do time. */
  tipo: TipoTime;
  /** Nome de exibição. */
  nome: string;
  /** Atendentes do time. */
  atendentes: AtendenteDTO[];
  /** Ids dos atendimentos aguardando na fila (ordem FIFO). */
  fila: string[];
}

/**
 * Métricas agregadas para o dashboard de acompanhamento.
 */
export interface MetricasDTO {
  /** Total de atendimentos em atendimento no momento. */
  emAtendimento: number;
  /** Total de atendimentos aguardando em fila. */
  aguardando: number;
  /** Total de atendimentos já finalizados. */
  finalizados: number;
  /** Tempo médio de espera (segundos) dos atendimentos já iniciados. */
  tempoMedioEsperaSegundos: number;
  /** Tempo médio de atendimento (segundos) dos já finalizados. */
  tempoMedioAtendimentoSegundos: number;
  /** Métricas quebradas por time. */
  porTime: MetricasTimeDTO[];
}

/**
 * Métricas agregadas de um time específico.
 */
export interface MetricasTimeDTO {
  /** Id do time. */
  timeId: string;
  /** Tipo do time. */
  tipo: TipoTime;
  /** Quantidade de atendentes. */
  totalAtendentes: number;
  /** Capacidade total do time (atendentes x capacidadeMax). */
  capacidadeTotal: number;
  /** Vagas ocupadas no momento. */
  ocupacao: number;
  /** Percentual de ocupação (0–100). */
  percentualOcupacao: number;
  /** Tamanho atual da fila. */
  tamanhoFila: number;
}

/**
 * Corpo aceito por `POST /atendimentos`.
 */
export interface CriarAtendimentoRequest {
  /** Identificador do cliente. */
  clienteId: string;
  /** Nome do cliente (opcional). */
  clienteNome?: string;
  /** Assunto da solicitação. */
  assunto: Assunto;
  /** Canal de origem (default: `API`). */
  canal?: Canal;
}

/**
 * Corpo aceito por `POST /atendimentos/:id/mensagens`.
 */
export interface EnviarMensagemRequest {
  /** Texto a ser enviado ao cliente. */
  texto: string;
}
