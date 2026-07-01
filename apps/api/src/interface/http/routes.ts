import type { FastifyInstance } from 'fastify';
import { atendimentoParaDTO, mensagemParaDTO } from '../../application/mappers.js';
import type { Container } from '../../container.js';
import {
  criarAtendimentoSchema,
  enviarMensagemSchema,
  filtroAtendimentosSchema,
  idParamSchema,
  simularMensagemSchema,
} from './schemas.js';

/**
 * Registra todas as rotas REST da aplicação.
 *
 * As rotas são deliberadamente finas: validam a entrada (zod), delegam ao
 * caso de uso/consulta apropriado e mapeiam o resultado para DTO. Toda regra de
 * negócio vive no domínio.
 *
 * @param app - Instância Fastify.
 * @param container - Dependências resolvidas da aplicação.
 */
export async function registrarRotas(app: FastifyInstance, container: Container): Promise<void> {
  app.get(
    '/health',
    { schema: { tags: ['sistema'], summary: 'Verifica a saúde do serviço.' } },
    async () => ({ status: 'ok' }),
  );

  app.post(
    '/atendimentos',
    {
      schema: {
        tags: ['atendimentos'],
        summary: 'Cria uma solicitação e a distribui (aloca ou enfileira).',
      },
    },
    async (request, reply) => {
      const body = criarAtendimentoSchema.parse(request.body);
      const atendimento = await container.motor.criarAtendimento({
        clienteId: body.clienteId,
        clienteNome: body.clienteNome,
        assunto: body.assunto,
        canal: body.canal ?? 'API',
      });
      return reply.status(201).send(atendimentoParaDTO(atendimento));
    },
  );

  app.get(
    '/atendimentos',
    { schema: { tags: ['atendimentos'], summary: 'Lista atendimentos (com filtros).' } },
    async (request) => {
      const filtro = filtroAtendimentosSchema.parse(request.query);
      return container.consultas.listarAtendimentos(filtro);
    },
  );

  app.get(
    '/atendimentos/:id',
    { schema: { tags: ['atendimentos'], summary: 'Detalha um atendimento e suas mensagens.' } },
    async (request) => {
      const { id } = idParamSchema.parse(request.params);
      return container.consultas.buscarAtendimento(id);
    },
  );

  app.patch(
    '/atendimentos/:id/finalizar',
    { schema: { tags: ['atendimentos'], summary: 'Finaliza um atendimento e libera a vaga.' } },
    async (request) => {
      const { id } = idParamSchema.parse(request.params);
      const atendimento = await container.motor.finalizarAtendimento(id);
      return atendimentoParaDTO(atendimento);
    },
  );

  app.post(
    '/atendimentos/:id/mensagens',
    { schema: { tags: ['atendimentos'], summary: 'Atendente responde ao cliente.' } },
    async (request, reply) => {
      const { id } = idParamSchema.parse(request.params);
      const body = enviarMensagemSchema.parse(request.body);
      const mensagem = await container.responderMensagem.executar(id, body.texto);
      return reply.status(201).send(mensagemParaDTO(mensagem));
    },
  );

  app.get(
    '/times',
    { schema: { tags: ['times'], summary: 'Lista times com atendentes e filas.' } },
    async () => container.consultas.listarTimes(),
  );

  app.get(
    '/atendentes',
    { schema: { tags: ['atendentes'], summary: 'Lista atendentes com carga atual.' } },
    async () => container.consultas.listarAtendentes(),
  );

  app.get(
    '/dashboard/metricas',
    { schema: { tags: ['dashboard'], summary: 'Métricas agregadas do dashboard.' } },
    async () => container.consultas.metricas(),
  );

  app.post(
    '/simular/whatsapp/mensagem',
    {
      schema: {
        tags: ['simulacao'],
        summary: 'Simula uma mensagem de WhatsApp recebida (canal mock).',
      },
    },
    async (request, reply) => {
      const body = simularMensagemSchema.parse(request.body);
      await container.canal.simularEntrada(body.clienteId, body.texto, body.clienteNome);
      return reply.status(202).send({ aceito: true });
    },
  );
}
