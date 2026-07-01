import type { TipoTime } from '@flowpay/shared';

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
   * @returns `true` se a fila está vazia.
   */
  filaVazia(): boolean {
    return this.filaEspera.length === 0;
  }
}
