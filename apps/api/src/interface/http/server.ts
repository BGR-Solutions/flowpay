import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config.js';
import type { Container } from '../../container.js';
import { WsGateway } from '../ws/ws-gateway.js';
import { tratarErro } from './error-handler.js';
import { registrarRotas } from './routes.js';

/**
 * Constrói e configura a instância Fastify com CORS, documentação OpenAPI,
 * WebSocket, rotas REST e tratamento de erros.
 *
 * @param container - Dependências resolvidas da aplicação.
 * @param config - Configuração da aplicação.
 * @returns A instância Fastify pronta para escutar.
 */
export async function construirServidor(
  container: Container,
  config: AppConfig,
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.logLevel },
  });

  app.setErrorHandler(tratarErro);

  await app.register(cors, { origin: config.corsOrigin });

  // Cabeçalhos de segurança. CSP é desabilitada para não quebrar o Swagger UI
  // (que injeta estilos/scripts inline em `/docs`).
  await app.register(helmet, { contentSecurityPolicy: false });

  // Limitação de taxa: protege contra abuso/rajadas. O handler devolve o erro
  // no mesmo formato Problem Details (RFC 7807) do restante da API.
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitJanelaMs,
    errorResponseBuilder: (_request, context) => ({
      type: 'https://flowpay.dev/problems/limite-de-taxa',
      title: 'Limite de requisições excedido.',
      status: 429,
      detail: `Máximo de ${context.max} requisições por ${context.after}.`,
      code: 'LIMITE_DE_TAXA',
    }),
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'FlowPay - API de Distribuição de Atendimentos',
        description:
          'API REST para distribuição e monitoramento de atendimentos da central de relacionamento FlowPay.',
        version: '0.1.0',
      },
      tags: [
        { name: 'atendimentos', description: 'Ciclo de vida dos atendimentos' },
        { name: 'times', description: 'Times de atendimento' },
        { name: 'atendentes', description: 'Atendentes e carga' },
        { name: 'dashboard', description: 'Métricas de acompanhamento' },
        { name: 'simulacao', description: 'Simulação do canal WhatsApp (mock)' },
        { name: 'sistema', description: 'Saúde e operação' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  await app.register(websocket);

  const wsGateway = new WsGateway(container.consultas, container.eventos);
  await app.register(async (instance) => {
    instance.get('/ws', { websocket: true }, (socket) => {
      void wsGateway.registrar(socket);
    });
  });

  await app.register(async (instance) => {
    await registrarRotas(instance, container);
  });

  return app;
}
