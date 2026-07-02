import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Atendimento } from '../../domain/entities/atendimento.js';
import { Mensagem } from '../../domain/entities/mensagem.js';
import { Time } from '../../domain/entities/time.js';
import { criarFileRepositories } from './file-repositories.js';

describe('criarFileRepositories', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'flowpay-persist-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('persiste e reidrata o estado completo entre instâncias', async () => {
    const primeira = await criarFileRepositories(dir);

    const time = new Time('time-1', 'CARTOES', 'Time Cartões');
    time.adicionarAtendente('at-1');
    await primeira.times.salvar(time);

    const atendimento = new Atendimento({
      id: 'atd-1',
      clienteId: 'cliente-1',
      canal: 'API',
      assunto: 'PROBLEMA_CARTAO',
      timeId: 'time-1',
      criadoEm: new Date('2024-01-01T00:00:00.000Z'),
    });
    atendimento.iniciar('at-1', new Date('2024-01-01T00:01:00.000Z'));
    atendimento.registrarPrimeiraResposta(new Date('2024-01-01T00:02:00.000Z'));
    await primeira.atendimentos.salvar(atendimento);

    await primeira.mensagens.salvar(
      new Mensagem('m-1', 'atd-1', 'IN', 'Olá', new Date('2024-01-01T00:00:30.000Z')),
    );

    // Nova instância lê do disco.
    const segunda = await criarFileRepositories(dir);
    expect(segunda.possuiEstado).toBe(true);

    const timeReidratado = await segunda.times.buscarPorId('time-1');
    expect(timeReidratado?.atendentesIds).toEqual(['at-1']);

    const atendimentoReidratado = await segunda.atendimentos.buscarPorId('atd-1');
    expect(atendimentoReidratado?.status).toBe('EM_ATENDIMENTO');
    expect(atendimentoReidratado?.atendenteId).toBe('at-1');
    expect(atendimentoReidratado?.primeiraRespostaEm?.toISOString()).toBe(
      '2024-01-01T00:02:00.000Z',
    );

    const mensagens = await segunda.mensagens.listarPorAtendimento('atd-1');
    expect(mensagens).toHaveLength(1);
    expect(mensagens[0]?.texto).toBe('Olá');
  });

  it('indica ausência de estado quando o diretório está vazio', async () => {
    const repos = await criarFileRepositories(dir);
    expect(repos.possuiEstado).toBe(false);
  });
});
