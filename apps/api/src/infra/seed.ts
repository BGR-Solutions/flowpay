import type { TipoTime } from '@flowpay/shared';
import { Atendente, CAPACIDADE_MAXIMA_PADRAO } from '../domain/entities/atendente.js';
import { Time } from '../domain/entities/time.js';
import type { IdGenerator } from '../domain/ports/id-generator.js';
import type { AtendenteRepository, TimeRepository } from '../domain/ports/repositories.js';

/**
 * Definição de um time a ser criado no seed.
 */
interface DefinicaoTime {
  /** Tipo do time. */
  tipo: TipoTime;
  /** Nome de exibição. */
  nome: string;
  /** Nomes dos atendentes do time. */
  atendentes: string[];
}

/**
 * Times e atendentes padrão da FlowPay, conforme o enunciado do desafio.
 */
export const TIMES_PADRAO: DefinicaoTime[] = [
  { tipo: 'CARTOES', nome: 'Time Cartões', atendentes: ['Ana', 'Bruno'] },
  { tipo: 'EMPRESTIMOS', nome: 'Time Empréstimos', atendentes: ['Carla', 'Diego'] },
  { tipo: 'OUTROS', nome: 'Time Outros Assuntos', atendentes: ['Eva', 'Felipe'] },
];

/**
 * Popula os repositórios com os times e atendentes iniciais.
 *
 * @param deps - Repositórios e gerador de ids.
 * @param deps.times - Repositório de times.
 * @param deps.atendentes - Repositório de atendentes.
 * @param deps.ids - Gerador de ids.
 * @param definicoes - Definições de times (default: {@link TIMES_PADRAO}).
 * @param capacidadeMax - Capacidade por atendente (default: 3).
 */
export async function popularDadosIniciais(
  deps: { times: TimeRepository; atendentes: AtendenteRepository; ids: IdGenerator },
  definicoes: DefinicaoTime[] = TIMES_PADRAO,
  capacidadeMax: number = CAPACIDADE_MAXIMA_PADRAO,
): Promise<void> {
  for (const def of definicoes) {
    const time = new Time(deps.ids.next(), def.tipo, def.nome);
    for (const nome of def.atendentes) {
      const atendente = new Atendente(deps.ids.next(), nome, time.id, capacidadeMax);
      time.adicionarAtendente(atendente.id);
      await deps.atendentes.salvar(atendente);
    }
    await deps.times.salvar(time);
  }
}
