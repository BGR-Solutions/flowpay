import type { TipoTime } from '@flowpay/shared';
import { MotorDistribuicao } from '../domain/distribuicao/motor-distribuicao.js';
import type { DomainEvent } from '../domain/events/domain-events.js';
import { InMemoryEventBus } from '../infra/event-bus/in-memory-event-bus.js';
import {
  InMemoryAtendenteRepository,
  InMemoryAtendimentoRepository,
  InMemoryTimeRepository,
} from '../infra/repositories/in-memory-repositories.js';
import { popularDadosIniciais } from '../infra/seed.js';
import { FakeClock, SequentialIdGenerator } from './fakes.js';

/**
 * Configuração de um cenário de teste do motor.
 */
export interface CenarioConfig {
  /** Definições de times (tipo, nome, atendentes). */
  times?: { tipo: TipoTime; nome: string; atendentes: string[] }[];
  /** Capacidade máxima por atendente. */
  capacidadeMax?: number;
}

/**
 * Artefatos de um cenário pronto para uso nos testes.
 */
export interface Cenario {
  /** Motor sob teste. */
  motor: MotorDistribuicao;
  /** Repositório de times. */
  times: InMemoryTimeRepository;
  /** Repositório de atendentes. */
  atendentes: InMemoryAtendenteRepository;
  /** Repositório de atendimentos. */
  atendimentos: InMemoryAtendimentoRepository;
  /** Relógio controlável. */
  clock: FakeClock;
  /** Eventos de domínio capturados, em ordem de emissão. */
  eventos: DomainEvent[];
}

/**
 * Monta um motor de distribuição totalmente cabeado com repositórios in-memory,
 * dados semeados e captura de eventos — reduz o boilerplate dos testes.
 *
 * @param config - Configuração opcional do cenário.
 * @returns Os artefatos do cenário.
 */
export async function montarCenario(config: CenarioConfig = {}): Promise<Cenario> {
  const times = new InMemoryTimeRepository();
  const atendentes = new InMemoryAtendenteRepository();
  const atendimentos = new InMemoryAtendimentoRepository();
  const clock = new FakeClock();
  const ids = new SequentialIdGenerator();
  const bus = new InMemoryEventBus();

  const eventos: DomainEvent[] = [];
  bus.assinar((e) => eventos.push(e));

  await popularDadosIniciais({ times, atendentes, ids }, config.times, config.capacidadeMax);

  const motor = new MotorDistribuicao({
    times,
    atendentes,
    atendimentos,
    clock,
    ids,
    eventos: bus,
  });

  return { motor, times, atendentes, atendimentos, clock, eventos };
}
