/**
 * Configuração da aplicação, derivada de variáveis de ambiente com defaults
 * seguros para desenvolvimento.
 */
export interface AppConfig {
  /** Porta HTTP do servidor. */
  port: number;
  /** Host de bind. */
  host: string;
  /** Origem(ns) permitida(s) para CORS. */
  corsOrigin: string;
  /** Nível de log do pino. */
  logLevel: string;
  /** Habilita o simulador automático de atendimentos. */
  simuladorHabilitado: boolean;
  /** Máximo de requisições por janela (rate limit). */
  rateLimitMax: number;
  /** Janela de tempo do rate limit, em milissegundos. */
  rateLimitJanelaMs: number;
  /** Estratégia de persistência dos repositórios. */
  persistencia: Persistencia;
  /** Diretório de persistência quando `persistencia = 'file'`. */
  persistenciaDir: string;
}

/** Estratégias de persistência suportadas pelos repositórios. */
export type Persistencia = 'memory' | 'file';

/**
 * Lê a configuração do ambiente.
 *
 * @param env - Objeto de variáveis de ambiente (default: `process.env`).
 * @returns Configuração resolvida.
 */
export function carregarConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return {
    port: Number(env.PORT ?? 3333),
    host: env.HOST ?? '0.0.0.0',
    corsOrigin: env.CORS_ORIGIN ?? '*',
    logLevel: env.LOG_LEVEL ?? 'info',
    simuladorHabilitado: env.SIMULADOR === 'true',
    rateLimitMax: Number(env.RATE_LIMIT_MAX ?? 300),
    rateLimitJanelaMs: Number(env.RATE_LIMIT_JANELA_MS ?? 60_000),
    persistencia: env.PERSISTENCIA === 'file' ? 'file' : 'memory',
    persistenciaDir: env.PERSISTENCIA_DIR ?? '.data',
  };
}
