import type { Assunto, Canal, StatusAtendimento } from '@flowpay/shared';
import { RegraNegocioError } from '../errors.js';

/**
 * Forma serializável de um {@link Atendimento}, usada por adaptadores de
 * persistência.
 */
export interface AtendimentoSnapshot {
  /** Identificador único. */
  id: string;
  /** Identificador do cliente. */
  clienteId: string;
  /** Nome do cliente, se conhecido. */
  clienteNome?: string;
  /** Canal de origem. */
  canal: Canal;
  /** Assunto. */
  assunto: Assunto;
  /** Time responsável. */
  timeId: string;
  /** Estado atual. */
  status: StatusAtendimento;
  /** Atendente responsável, se houver. */
  atendenteId?: string;
  /** Instante de criação (ISO 8601). */
  criadoEm: string;
  /** Instante de início (ISO 8601), se houver. */
  iniciadoEm?: string;
  /** Instante de finalização (ISO 8601), se houver. */
  finalizadoEm?: string;
  /** Instante de abandono (ISO 8601), se houver. */
  abandonadoEm?: string;
  /** Instante da primeira resposta (ISO 8601), se houver. */
  primeiraRespostaEm?: string;
}

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
 * máquina de estados e rejeita transições inválidas:
 *
 * - `AGUARDANDO -> EM_ATENDIMENTO -> FINALIZADO`
 * - `AGUARDANDO -> ABANDONADO` (cliente desiste enquanto aguarda na fila).
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
  /** Instante de abandono da fila. */
  private _abandonadoEm?: Date;
  /** Instante da primeira resposta do atendente. */
  private _primeiraRespostaEm?: Date;

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

  /** @returns Instante de abandono da fila, se houver. */
  get abandonadoEm(): Date | undefined {
    return this._abandonadoEm;
  }

  /** @returns Instante da primeira resposta do atendente, se houver. */
  get primeiraRespostaEm(): Date | undefined {
    return this._primeiraRespostaEm;
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
   * Marca o atendimento como abandonado (cliente desistiu enquanto aguardava).
   *
   * @param agora - Instante do abandono.
   * @throws {@link RegraNegocioError} se não está `AGUARDANDO`.
   */
  abandonar(agora: Date): void {
    if (this._status !== 'AGUARDANDO') {
      throw new RegraNegocioError(
        `Atendimento ${this.id} só pode ser abandonado enquanto aguarda (estado atual: ${this._status}).`,
        'TRANSICAO_INVALIDA',
      );
    }
    this._status = 'ABANDONADO';
    this._abandonadoEm = agora;
  }

  /**
   * Registra o instante da primeira resposta do atendente (idempotente:
   * mantém o primeiro valor).
   *
   * @param agora - Instante da resposta.
   */
  registrarPrimeiraResposta(agora: Date): void {
    if (!this._primeiraRespostaEm) {
      this._primeiraRespostaEm = agora;
    }
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
   * @returns Tempo até a primeira resposta do atendente (FRT), em segundos,
   * contado desde a criação, ou `undefined` se ainda não houve resposta.
   */
  tempoPrimeiraRespostaSegundos(): number | undefined {
    if (!this._primeiraRespostaEm) return undefined;
    return (this._primeiraRespostaEm.getTime() - this.criadoEm.getTime()) / 1000;
  }

  /**
   * @returns Duração do atendimento, em segundos, ou `undefined` se ainda não
   * foi finalizado.
   */
  tempoAtendimentoSegundos(): number | undefined {
    if (!this._iniciadoEm || !this._finalizadoEm) return undefined;
    return (this._finalizadoEm.getTime() - this._iniciadoEm.getTime()) / 1000;
  }

  /**
   * @returns Representação serializável deste atendimento (inclui o estado
   * completo da máquina de estados).
   */
  paraSnapshot(): AtendimentoSnapshot {
    return {
      id: this.id,
      clienteId: this.clienteId,
      clienteNome: this.clienteNome,
      canal: this.canal,
      assunto: this.assunto,
      timeId: this.timeId,
      status: this._status,
      atendenteId: this._atendenteId,
      criadoEm: this.criadoEm.toISOString(),
      iniciadoEm: this._iniciadoEm?.toISOString(),
      finalizadoEm: this._finalizadoEm?.toISOString(),
      abandonadoEm: this._abandonadoEm?.toISOString(),
      primeiraRespostaEm: this._primeiraRespostaEm?.toISOString(),
    };
  }

  /**
   * Reconstrói um {@link Atendimento} a partir de sua forma serializada,
   * restaurando diretamente o estado (sem reexecutar as transições).
   *
   * @param s - Snapshot previamente persistido.
   * @returns O atendimento reidratado.
   */
  static restaurar(s: AtendimentoSnapshot): Atendimento {
    const atendimento = new Atendimento({
      id: s.id,
      clienteId: s.clienteId,
      clienteNome: s.clienteNome,
      canal: s.canal,
      assunto: s.assunto,
      timeId: s.timeId,
      criadoEm: new Date(s.criadoEm),
    });
    atendimento._status = s.status;
    atendimento._atendenteId = s.atendenteId;
    atendimento._iniciadoEm = s.iniciadoEm ? new Date(s.iniciadoEm) : undefined;
    atendimento._finalizadoEm = s.finalizadoEm ? new Date(s.finalizadoEm) : undefined;
    atendimento._abandonadoEm = s.abandonadoEm ? new Date(s.abandonadoEm) : undefined;
    atendimento._primeiraRespostaEm = s.primeiraRespostaEm
      ? new Date(s.primeiraRespostaEm)
      : undefined;
    return atendimento;
  }
}
