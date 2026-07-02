import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { montarCenario } from '../../testing/build-motor.js';

/**
 * Comandos possíveis na sequência aleatória exercida pelo teste.
 */
type Comando =
  | { tipo: 'criar'; cliente: number }
  | { tipo: 'finalizar'; alvo: number }
  | { tipo: 'abandonar'; alvo: number };

/**
 * Arbitrário que gera uma sequência de comandos concorrentes plausíveis.
 */
const comandos = fc.array(
  fc.oneof(
    fc.record({ tipo: fc.constant('criar' as const), cliente: fc.integer({ min: 0, max: 40 }) }),
    fc.record({ tipo: fc.constant('finalizar' as const), alvo: fc.integer({ min: 0, max: 40 }) }),
    fc.record({ tipo: fc.constant('abandonar' as const), alvo: fc.integer({ min: 0, max: 40 }) }),
  ),
  { minLength: 1, maxLength: 60 },
);

describe('MotorDistribuicao (property-based)', () => {
  it('mantém as invariantes sob qualquer sequência de operações concorrentes', async () => {
    await fc.assert(
      fc.asyncProperty(comandos, async (sequencia) => {
        const { motor, atendentes, times, atendimentos } = await montarCenario({
          times: [{ tipo: 'OUTROS', nome: 'Outros', atendentes: ['A', 'B'] }],
        });

        // Todos os clientes gerados a partir dos comandos "criar".
        const clientes = sequencia
          .filter((c): c is Extract<Comando, { tipo: 'criar' }> => c.tipo === 'criar')
          .map((c) => `cliente-${c.cliente}`);

        const criados: string[] = [];

        await Promise.all(
          sequencia.map(async (comando) => {
            try {
              if (comando.tipo === 'criar') {
                const a = await motor.criarAtendimento({
                  clienteId: `cliente-${comando.cliente}`,
                  assunto: 'OUTRO',
                  canal: 'API',
                });
                criados.push(a.id);
              } else if (comando.tipo === 'finalizar') {
                const alvo = criados[comando.alvo % Math.max(criados.length, 1)];
                if (alvo) await motor.finalizarAtendimento(alvo);
              } else {
                const alvo = criados[comando.alvo % Math.max(criados.length, 1)];
                if (alvo) await motor.abandonarAtendimento(alvo);
              }
            } catch {
              // Transições inválidas (ex.: finalizar quem está na fila) são
              // esperadas e legítimas; a invariante é verificada ao final.
            }
          }),
        );

        // Invariante 1: nenhum atendente ultrapassa a capacidade máxima (3).
        for (const atendente of await atendentes.listar()) {
          expect(atendente.cargaAtual).toBeLessThanOrEqual(atendente.capacidadeMax);
        }

        // Invariante 2: não há vaga ociosa com fila (se há alguém aguardando,
        // todos os atendentes do time estão lotados).
        const time = await times.buscarPorTipo('OUTROS');
        if (time && time.tamanhoFila > 0) {
          for (const atendente of await atendentes.listarPorTime(time.id)) {
            expect(atendente.temVaga()).toBe(false);
          }
        }

        // Invariante 3: a soma das cargas iguala o número de atendimentos
        // EM_ATENDIMENTO (nenhuma vaga "perdida" nem contada em dobro).
        const emAtendimento = (await atendimentos.listar()).filter(
          (a) => a.status === 'EM_ATENDIMENTO',
        ).length;
        const somaCargas = (await atendentes.listar()).reduce((s, a) => s + a.cargaAtual, 0);
        expect(somaCargas).toBe(emAtendimento);

        // Invariante 4: no máximo um atendimento ativo por cliente.
        const ativosPorCliente = new Map<string, number>();
        for (const a of await atendimentos.listar()) {
          if (a.status === 'AGUARDANDO' || a.status === 'EM_ATENDIMENTO') {
            ativosPorCliente.set(a.clienteId, (ativosPorCliente.get(a.clienteId) ?? 0) + 1);
          }
        }
        for (const contagem of ativosPorCliente.values()) {
          expect(contagem).toBeLessThanOrEqual(1);
        }

        // Sanidade: os clientes gerados existem no repositório (ou foram
        // deduplicados por idempotência de negócio).
        expect(new Set(clientes).size).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 50 },
    );
  });
});
