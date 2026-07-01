import type { AtendimentoDTO, MetricasDTO, TimeDTO } from '@flowpay/shared';
import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { carregarConfig } from '../../config.js';
import { criarContainer } from '../../container.js';
import { construirServidor } from './server.js';

describe('API HTTP', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    const container = await criarContainer();
    app = await construirServidor(container, carregarConfig({ LOG_LEVEL: 'silent' }));
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /health responde ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('POST /atendimentos cria e aloca um atendimento', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/atendimentos',
      payload: { clienteId: 'cliente-1', assunto: 'PROBLEMA_CARTAO' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<AtendimentoDTO>();
    expect(body.status).toBe('EM_ATENDIMENTO');
    expect(body.canal).toBe('API');
  });

  it('POST /atendimentos valida o corpo (assunto inválido -> 400)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/atendimentos',
      payload: { clienteId: 'cliente-1', assunto: 'INVALIDO' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDACAO');
  });

  it('PATCH /atendimentos/:id/finalizar finaliza um atendimento', async () => {
    const criado = await app.inject({
      method: 'POST',
      url: '/atendimentos',
      payload: { clienteId: 'cliente-2', assunto: 'OUTRO' },
    });
    const { id } = criado.json<AtendimentoDTO>();

    const res = await app.inject({ method: 'PATCH', url: `/atendimentos/${id}/finalizar` });
    expect(res.statusCode).toBe(200);
    expect(res.json<AtendimentoDTO>().status).toBe('FINALIZADO');
  });

  it('GET /atendimentos/:id inexistente -> 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/atendimentos/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('NAO_ENCONTRADO');
  });

  it('GET /times retorna os três times', async () => {
    const res = await app.inject({ method: 'GET', url: '/times' });
    expect(res.statusCode).toBe(200);
    const tipos = res.json<TimeDTO[]>().map((t) => t.tipo).sort();
    expect(tipos).toEqual(['CARTOES', 'EMPRESTIMOS', 'OUTROS']);
  });

  it('GET /dashboard/metricas agrega os dados', async () => {
    await app.inject({
      method: 'POST',
      url: '/atendimentos',
      payload: { clienteId: 'cliente-3', assunto: 'CONTRATACAO_EMPRESTIMO' },
    });
    const res = await app.inject({ method: 'GET', url: '/dashboard/metricas' });
    expect(res.statusCode).toBe(200);
    const metricas = res.json<MetricasDTO>();
    expect(metricas.emAtendimento).toBe(1);
    expect(metricas.porTime).toHaveLength(3);
  });

  it('POST /simular/whatsapp/mensagem cria atendimento via canal mock', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/simular/whatsapp/mensagem',
      payload: { clienteId: '+5511999999999', texto: 'Problema no cartão' },
    });
    expect(res.statusCode).toBe(202);

    const lista = await app.inject({ method: 'GET', url: '/atendimentos' });
    const atendimentos = lista.json<AtendimentoDTO[]>();
    expect(atendimentos).toHaveLength(1);
    expect(atendimentos[0]?.canal).toBe('WHATSAPP');
    expect(atendimentos[0]?.assunto).toBe('PROBLEMA_CARTAO');
  });
});
