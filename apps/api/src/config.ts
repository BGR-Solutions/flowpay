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
}

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
  };
}
