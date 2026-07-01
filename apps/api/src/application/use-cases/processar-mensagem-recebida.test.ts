import { describe, expect, it } from 'vitest';
import { MotorDistribuicao } from '../../domain/distribuicao/motor-distribuicao.js';
import { InMemoryEventBus } from '../../infra/event-bus/in-memory-event-bus.js';
import { WhatsAppMockAdapter } from '../../infra/channels/whatsapp-mock-adapter.js';
import {
  InMemoryAtendenteRepository,
  InMemoryAtendimentoRepository,
  InMemoryMensagemRepository,
  InMemoryTimeRepository,
} from '../../infra/repositories/in-memory-repositories.js';
import { popularDadosIniciais } from '../../infra/seed.js';
import { FakeClock, SequentialIdGenerator } from '../../testing/fakes.js';
import { ProcessarMensagemRecebida } from './processar-mensagem-recebida.js';

async function montar() {
  const times = new InMemoryTimeRepository();
  const atendentes = new InMemoryAtendenteRepository();
  const atendimentos = new InMemoryAtendimentoRepository();
  const mensagens = new InMemoryMensagemRepository();
  const clock = new FakeClock();
  const ids = new SequentialIdGenerator();
  const eventos = new InMemoryEventBus();

  await popularDadosIniciais({ times, atendentes, ids }, [
    { tipo: 'CARTOES', nome: 'Cartões', atendentes: ['Ana'] },
  ]);

  const motor = new MotorDistribuicao({ times, atendentes, atendimentos, clock, ids, eventos });
  const canal = new WhatsAppMockAdapter(ids, clock);
  const uc = new ProcessarMensagemRecebida({
    motor,
    atendimentos,
    mensagens,
    times,
    canal,
    eventos,
    ids,
  });
  canal.onMensagem((m) => uc.executar(m).then(() => undefined));

  return { uc, canal, atendimentos, mensagens };
}

describe('ProcessarMensagemRecebida', () => {
  it('cria atendimento a partir de mensagem recebida e envia aviso de alocação', async () => {
    const { canal, atendimentos } = await montar();

    await canal.simularEntrada('+551199', 'problema no cartão');

    const lista = await atendimentos.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0]?.assunto).toBe('PROBLEMA_CARTAO');
    expect(canal.enviadas.at(-1)?.texto).toContain('atendentes já está com você');
  });

  it('é idempotente por externalId (não duplica mensagem)', async () => {
    const { uc, mensagens } = await montar();

    const entrada = {
      externalId: 'wamid-1',
      clienteId: '+551188',
      texto: 'cartão',
      recebidoEm: new Date(),
    };
    const primeiro = await uc.executar(entrada);
    const segundo = await uc.executar(entrada);

    expect(segundo.id).toBe(primeiro.id);
    expect(await mensagens.listarPorAtendimento(primeiro.id)).toHaveLength(1);
  });

  it('informa posição na fila quando o time está lotado', async () => {
    const { canal } = await montar();

    // Ana tem capacidade 3: 3 alocados, o 4º vai para a fila.
    for (let i = 0; i < 3; i += 1) {
      await canal.simularEntrada(`+5511000${i}`, 'cartão');
    }
    await canal.simularEntrada('+5511fila', 'cartão');

    expect(canal.enviadas.at(-1)?.texto).toContain('fila (posição 1)');
  });
});
