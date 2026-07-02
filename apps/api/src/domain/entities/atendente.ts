import { RegraNegocioError } from '../errors.js';

/** Capacidade máxima de atendimentos simultâneos por atendente (regra FlowPay). */
export const CAPACIDADE_MAXIMA_PADRAO = 3;

/**
 * Forma serializável de um {@link Atendente}, usada por adaptadores de
 * persistência.
 */
export interface AtendenteSnapshot {
  /** Identificador único. */
  id: string;
  /** Nome de exibição. */
  nome: string;
  /** Time ao qual pertence. */
  timeId: string;
  /** Capacidade máxima. */
  capacidadeMax: number;
  /** Ids dos atendimentos ativos. */
  ativos: string[];
}

/**
 * Atendente é o recurso que consome atendimentos. A invariante central —
 * nunca ultrapassar {@link Atendente.capacidadeMax} atendimentos simultâneos —
 * é garantida por esta entidade.
 */
export class Atendente {
  /** Ids dos atendimentos atualmente atribuídos a este atendente. */
  private readonly ativos = new Set<string>();

  /**
   * @param id - Identificador único.
   * @param nome - Nome de exibição.
   * @param timeId - Time ao qual pertence.
   * @param capacidadeMax - Máximo de atendimentos simultâneos.
   */
  constructor(
    public readonly id: string,
    public readonly nome: string,
    public readonly timeId: string,
    public readonly capacidadeMax: number = CAPACIDADE_MAXIMA_PADRAO,
  ) {}

  /**
   * @returns Quantidade de atendimentos ativos.
   */
  get cargaAtual(): number {
    return this.ativos.size;
  }

  /**
   * @returns Ids dos atendimentos ativos, em ordem de atribuição.
   */
  get atendimentosAtivos(): string[] {
    return [...this.ativos];
  }

  /**
   * @returns `true` se o atendente pode receber mais um atendimento.
   */
  temVaga(): boolean {
    return this.ativos.size < this.capacidadeMax;
  }

  /**
   * Atribui um atendimento a este atendente.
   *
   * @param atendimentoId - Id do atendimento a atribuir.
   * @throws {@link RegraNegocioError} se o atendente já está na capacidade
   * máxima — protege a invariante mesmo diante de chamadas concorrentes.
   */
  alocar(atendimentoId: string): void {
    if (!this.temVaga()) {
      throw new RegraNegocioError(
        `Atendente ${this.id} já está na capacidade máxima (${this.capacidadeMax}).`,
        'CAPACIDADE_EXCEDIDA',
      );
    }
    this.ativos.add(atendimentoId);
  }

  /**
   * Libera um atendimento previamente atribuído.
   *
   * @param atendimentoId - Id do atendimento a liberar.
   * @returns `true` se havia esse atendimento e ele foi liberado.
   */
  liberar(atendimentoId: string): boolean {
    return this.ativos.delete(atendimentoId);
  }

  /**
   * @returns Representação serializável deste atendente.
   */
  paraSnapshot(): AtendenteSnapshot {
    return {
      id: this.id,
      nome: this.nome,
      timeId: this.timeId,
      capacidadeMax: this.capacidadeMax,
      ativos: this.atendimentosAtivos,
    };
  }

  /**
   * Reconstrói um {@link Atendente} a partir de sua forma serializada,
   * restaurando os atendimentos ativos sem passar pela validação de
   * capacidade (estado já consistente no momento da persistência).
   *
   * @param s - Snapshot previamente persistido.
   * @returns O atendente reidratado.
   */
  static restaurar(s: AtendenteSnapshot): Atendente {
    const atendente = new Atendente(s.id, s.nome, s.timeId, s.capacidadeMax);
    for (const id of s.ativos) {
      atendente.ativos.add(id);
    }
    return atendente;
  }
}
