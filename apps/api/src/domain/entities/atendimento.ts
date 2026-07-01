import type { Assunto, Canal, StatusAtendimento } from '@flowpay/shared';
import { RegraNegocioError } from '../errors.js';

/**
 * Parâmetros de construção de um {@link Atendimento}.
 */
export interface CriarAtendimentoParams {
  /** Identificador único. */
  id: string;
  /** Identificador do cliente. */
  clienteId: string;
  /** Nome do cliente (opcional). */
  clienteNome?: string;
  /** Canal de origem. */
  canal: Canal;
  /** Assunto da solicitação. */
  assunto: Assunto;
  /** Time responsável (derivado do assunto). */
  timeId: string;
  /** Instante de criação. */
  criadoEm: Date;
}

/**
 * Atendimento é a unidade de trabalho distribuída aos atendentes. Encapsula a
 * máquina de estados `AGUARDANDO -> EM_ATENDIMENTO -> FINALIZADO` e rejeita
 * transições inválidas.
 */
export class Atendimento {
  /** Identificador único. */
  public readonly id: string;
  /** Identificador do cliente. */
  public readonly clienteId: string;
  /** Nome do cliente, quando conhecido. */
  public readonly clienteNome?: string;
  /** Canal de origem. */
  public readonly canal: Canal;
  /** Assunto informado. */
  public readonly assunto: Assunto;
  /** Time responsável. */
  public readonly timeId: string;
  /** Instante de criação. */
  public readonly criadoEm: Date;

  /** Estado atual. */
  private _status: StatusAtendimento = 'AGUARDANDO';
  /** Atendente responsável (definido ao ser alocado). */
  private _atendenteId?: string;
  /** Instante em que passou a ser atendido. */
  private _iniciadoEm?: Date;
  /** Instante de finalização. */
  private _finalizadoEm?: Date;

  /**
   * @param params - Dados de criação do atendimento.
   */
  constructor(params: CriarAtendimentoParams) {
    this.id = params.id;
    this.clienteId = params.clienteId;
    this.clienteNome = params.clienteNome;
    this.canal = params.canal;
    this.assunto = params.assunto;
    this.timeId = params.timeId;
    this.criadoEm = params.criadoEm;
  }

  /** @returns Estado atual. */
  get status(): StatusAtendimento {
    return this._status;
  }

  /** @returns Atendente responsável, se houver. */
  get atendenteId(): string | undefined {
    return this._atendenteId;
  }

  /** @returns Instante de início do atendimento, se houver. */
  get iniciadoEm(): Date | undefined {
    return this._iniciadoEm;
  }

  /** @returns Instante de finalização, se houver. */
  get finalizadoEm(): Date | undefined {
    return this._finalizadoEm;
  }

  /**
   * Marca o atendimento como em atendimento por um atendente.
   *
   * @param atendenteId - Atendente responsável.
   * @param agora - Instante do início.
   * @throws {@link RegraNegocioError} se o atendimento não está `AGUARDANDO`.
   */
  iniciar(atendenteId: string, agora: Date): void {
    if (this._status !== 'AGUARDANDO') {
      throw new RegraNegocioError(
        `Atendimento ${this.id} não pode iniciar a partir do estado ${this._status}.`,
        'TRANSICAO_INVALIDA',
      );
    }
    this._status = 'EM_ATENDIMENTO';
    this._atendenteId = atendenteId;
    this._iniciadoEm = agora;
  }

  /**
   * Finaliza o atendimento.
   *
   * @param agora - Instante da finalização.
   * @throws {@link RegraNegocioError} se não está `EM_ATENDIMENTO`.
   */
  finalizar(agora: Date): void {
    if (this._status !== 'EM_ATENDIMENTO') {
      throw new RegraNegocioError(
        `Atendimento ${this.id} não pode finalizar a partir do estado ${this._status}.`,
        'TRANSICAO_INVALIDA',
      );
    }
    this._status = 'FINALIZADO';
    this._finalizadoEm = agora;
  }

  /**
   * @returns Tempo de espera em fila, em segundos, ou `undefined` se ainda não
   * foi iniciado.
   */
  tempoEsperaSegundos(): number | undefined {
    if (!this._iniciadoEm) return undefined;
    return (this._iniciadoEm.getTime() - this.criadoEm.getTime()) / 1000;
  }

  /**
   * @returns Duração do atendimento, em segundos, ou `undefined` se ainda não
   * foi finalizado.
   */
  tempoAtendimentoSegundos(): number | undefined {
    if (!this._iniciadoEm || !this._finalizadoEm) return undefined;
    return (this._finalizadoEm.getTime() - this._iniciadoEm.getTime()) / 1000;
  }
}
