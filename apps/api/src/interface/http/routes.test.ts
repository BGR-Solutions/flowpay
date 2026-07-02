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

  it('GET /dashboard/metricas expõe indicadores de SLA', async () => {
    const res = await app.inject({ method: 'GET', url: '/dashboard/metricas' });
    const metricas = res.json<MetricasDTO>();
    expect(metricas.sla).toBeDefined();
    expect(metricas.sla).toHaveProperty('esperaP95Segundos');
    expect(metricas.sla).toHaveProperty('taxaAbandonoFila');
    expect(metricas).toHaveProperty('abandonados');
  });

  it('PATCH /atendimentos/:id/abandonar marca a fila como abandonada e conta churn', async () => {
    // Lota os atendentes do time Outros (2 x capacidade 3 = 6) e enfileira os demais.
    let aguardandoId = '';
    for (let i = 0; i < 8; i += 1) {
      const criado = await app.inject({
        method: 'POST',
        url: '/atendimentos',
        payload: { clienteId: `fila-${i}`, assunto: 'OUTRO' },
      });
      const dto = criado.json<AtendimentoDTO>();
      if (dto.status === 'AGUARDANDO') aguardandoId = dto.id;
    }
    expect(aguardandoId).not.toBe('');

    const res = await app.inject({ method: 'PATCH', url: `/atendimentos/${aguardandoId}/abandonar` });
    expect(res.statusCode).toBe(200);
    expect(res.json<AtendimentoDTO>().status).toBe('ABANDONADO');

    const metricas = await app.inject({ method: 'GET', url: '/dashboard/metricas' });
    expect(metricas.json<MetricasDTO>().abandonados).toBe(1);
  });

  it('erros seguem o formato Problem Details (RFC 7807)', async () => {
    const res = await app.inject({ method: 'GET', url: '/atendimentos/nao-existe' });
    expect(res.statusCode).toBe(404);
    expect(res.headers['content-type']).toContain('application/problem+json');
    const corpo = res.json();
    expect(corpo).toMatchObject({ type: expect.any(String), title: expect.any(String), status: 404 });
  });

  it('Idempotency-Key evita criar atendimentos duplicados', async () => {
    const opcoes = {
      method: 'POST' as const,
      url: '/atendimentos',
      headers: { 'idempotency-key': 'chave-abc' },
      payload: { clienteId: 'cliente-idem', assunto: 'OUTRO' },
    };
    const primeira = await app.inject(opcoes);
    const segunda = await app.inject(opcoes);

    expect(primeira.statusCode).toBe(201);
    expect(segunda.statusCode).toBe(201);
    expect(segunda.json<AtendimentoDTO>().id).toBe(primeira.json<AtendimentoDTO>().id);

    const lista = await app.inject({ method: 'GET', url: '/atendimentos' });
    const doCliente = lista.json<AtendimentoDTO[]>().filter((a) => a.clienteId === 'cliente-idem');
    expect(doCliente).toHaveLength(1);
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
