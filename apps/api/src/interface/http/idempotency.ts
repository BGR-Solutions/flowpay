/**
 * Resposta materializada de uma operação idempotente.
 */
export interface RespostaIdempotente {
  /** Código HTTP a repetir. */
  status: number;
  /** Corpo (já serializável em JSON) a repetir. */
  corpo: unknown;
}

/**
 * Registro interno com expiração.
 */
interface Registro {
  /** Resposta a ser repetida. */
  resposta: RespostaIdempotente;
  /** Instante (epoch ms) em que o registro expira. */
  expiraEm: number;
}

/**
 * Armazém em memória de respostas idempotentes, indexado por `Idempotency-Key`.
 *
 * Garante que reenvios de uma mesma requisição (mesmo cabeçalho
 * `Idempotency-Key`) não produzam efeitos duplicados: a primeira execução é
 * memorizada e as repetições recebem a resposta original.
 *
 * O escopo é o processo atual (adequado à persistência in-memory). Numa
 * topologia multi-instância, esta porta seria trocada por Redis com a mesma
 * interface.
 */
export class IdempotencyStore {
  /** Registros vivos por chave. */
  private readonly registros = new Map<string, Registro>();

  /**
   * @param ttlMs - Tempo de vida de cada chave (default: 10 minutos).
   */
  constructor(private readonly ttlMs = 10 * 60 * 1000) {}

  /**
   * Recupera a resposta memorizada para uma chave, se ainda válida.
   *
   * @param chave - Valor do cabeçalho `Idempotency-Key`.
   * @returns A resposta memorizada, ou `undefined` se ausente/expirada.
   */
  obter(chave: string): RespostaIdempotente | undefined {
    const registro = this.registros.get(chave);
    if (!registro) return undefined;
    if (registro.expiraEm <= Date.now()) {
      this.registros.delete(chave);
      return undefined;
    }
    return registro.resposta;
  }

  /**
   * Memoriza a resposta de uma operação idempotente.
   *
   * @param chave - Valor do cabeçalho `Idempotency-Key`.
   * @param resposta - Resposta a repetir em reenvios.
   */
  registrar(chave: string, resposta: RespostaIdempotente): void {
    this.registros.set(chave, { resposta, expiraEm: Date.now() + this.ttlMs });
  }
}
