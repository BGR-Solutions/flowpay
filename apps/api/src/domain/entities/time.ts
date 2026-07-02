import type { TipoTime } from '@flowpay/shared';

/**
 * Forma serializável de um {@link Time}, usada por adaptadores de persistência.
 */
export interface TimeSnapshot {
  /** Identificador único. */
  id: string;
  /** Categoria do time. */
  tipo: TipoTime;
  /** Nome de exibição. */
  nome: string;
  /** Ids dos atendentes. */
  atendentes: string[];
  /** Fila de ids de atendimentos aguardando (ordem FIFO). */
  fila: string[];
}

/**
 * Time de atendimento. Agrupa atendentes e mantém a **fila FIFO** de
 * atendimentos aguardando quando todos os atendentes estão ocupados.
 *
 * A fila é modelada dentro do time (e não globalmente) porque a regra de
 * negócio é local: "ao liberar uma vaga *neste* time, puxe o próximo *desta*
 * fila".
 */
export class Time {
  /** Ids dos atendentes pertencentes ao time. */
  private readonly atendentes = new Set<string>();

  /** Fila de ids de atendimentos aguardando (frente = índice 0). */
  private readonly filaEspera: string[] = [];

  /**
   * @param id - Identificador único.
   * @param tipo - Categoria do time.
   * @param nome - Nome de exibição.
   */
  constructor(
    public readonly id: string,
    public readonly tipo: TipoTime,
    public readonly nome: string,
  ) {}

  /**
   * Registra um atendente como membro do time.
   *
   * @param atendenteId - Id do atendente.
   */
  adicionarAtendente(atendenteId: string): void {
    this.atendentes.add(atendenteId);
  }

  /**
   * @returns Ids dos atendentes do time.
   */
  get atendentesIds(): string[] {
    return [...this.atendentes];
  }

  /**
   * @returns Cópia da fila atual (ordem FIFO).
   */
  get fila(): string[] {
    return [...this.filaEspera];
  }

  /**
   * @returns Tamanho atual da fila.
   */
  get tamanhoFila(): number {
    return this.filaEspera.length;
  }

  /**
   * Adiciona um atendimento ao fim da fila.
   *
   * @param atendimentoId - Id do atendimento a enfileirar.
   */
  enfileirar(atendimentoId: string): void {
    this.filaEspera.push(atendimentoId);
  }

  /**
   * Remove e retorna o próximo atendimento da fila (FIFO).
   *
   * @returns O id do próximo atendimento, ou `undefined` se a fila está vazia.
   */
  desenfileirar(): string | undefined {
    return this.filaEspera.shift();
  }

  /**
   * Remove um atendimento específico da fila (ex.: abandono), preservando a
   * ordem dos demais.
   *
   * @param atendimentoId - Id do atendimento a remover.
   * @returns `true` se o atendimento estava na fila e foi removido.
   */
  removerDaFila(atendimentoId: string): boolean {
    const indice = this.filaEspera.indexOf(atendimentoId);
    if (indice === -1) return false;
    this.filaEspera.splice(indice, 1);
    return true;
  }

  /**
   * @returns `true` se a fila está vazia.
   */
  filaVazia(): boolean {
    return this.filaEspera.length === 0;
  }

  /**
   * @returns Representação serializável deste time.
   */
  paraSnapshot(): TimeSnapshot {
    return {
      id: this.id,
      tipo: this.tipo,
      nome: this.nome,
      atendentes: this.atendentesIds,
      fila: this.fila,
    };
  }

  /**
   * Reconstrói um {@link Time} a partir de sua forma serializada, preservando
   * a ordem da fila.
   *
   * @param s - Snapshot previamente persistido.
   * @returns O time reidratado.
   */
  static restaurar(s: TimeSnapshot): Time {
    const time = new Time(s.id, s.tipo, s.nome);
    for (const atendenteId of s.atendentes) {
      time.adicionarAtendente(atendenteId);
    }
    for (const atendimentoId of s.fila) {
      time.enfileirar(atendimentoId);
    }
    return time;
  }
}
