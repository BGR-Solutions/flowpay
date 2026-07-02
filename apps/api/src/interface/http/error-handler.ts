import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError, NaoEncontradoError } from '../../domain/errors.js';

/** Media type padronizado para respostas de erro (RFC 7807). */
const PROBLEM_JSON = 'application/problem+json';

/** URI base para os tipos de problema documentados. */
const TIPO_BASE = 'https://flowpay.dev/problems';

/**
 * Corpo de erro no formato *Problem Details* (RFC 7807).
 */
interface ProblemDetails {
  /** URI que identifica o tipo do problema. */
  type: string;
  /** Resumo legível e estável do problema. */
  title: string;
  /** Código HTTP. */
  status: number;
  /** Descrição específica desta ocorrência. */
  detail: string;
  /** Código de negócio para consumo programático. */
  code: string;
  /** Detalhes adicionais (ex.: issues de validação). */
  errors?: unknown;
}

/**
 * Envia uma resposta de erro no formato Problem Details (RFC 7807), com o
 * media type `application/problem+json`.
 *
 * @param reply - Resposta Fastify.
 * @param problem - Detalhes do problema.
 * @returns A resposta enviada.
 */
function enviarProblema(reply: FastifyReply, problem: ProblemDetails): FastifyReply {
  return reply.status(problem.status).type(PROBLEM_JSON).send(problem);
}

/**
 * Handler global de erros: traduz erros de domínio e de validação em respostas
 * HTTP consistentes no formato **Problem Details (RFC 7807)**, evitando vazar
 * detalhes internos.
 *
 * @param error - Erro capturado.
 * @param request - Requisição em curso.
 * @param reply - Resposta a ser enviada.
 */
export function tratarErro(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  if (error instanceof ZodError) {
    return enviarProblema(reply, {
      type: `${TIPO_BASE}/validacao`,
      title: 'Dados inválidos.',
      status: 400,
      detail: 'A requisição não passou na validação do schema.',
      code: 'VALIDACAO',
      errors: error.issues,
    });
  }

  if (error instanceof NaoEncontradoError) {
    return enviarProblema(reply, {
      type: `${TIPO_BASE}/nao-encontrado`,
      title: 'Recurso não encontrado.',
      status: 404,
      detail: error.message,
      code: error.code,
    });
  }

  if (error instanceof DomainError) {
    return enviarProblema(reply, {
      type: `${TIPO_BASE}/regra-de-negocio`,
      title: 'Conflito com regra de negócio.',
      status: 409,
      detail: error.message,
      code: error.code,
    });
  }

  const statusCode = (error as FastifyError).statusCode;
  if (typeof statusCode === 'number' && statusCode < 500) {
    return enviarProblema(reply, {
      type: `${TIPO_BASE}/requisicao-invalida`,
      title: 'Requisição inválida.',
      status: statusCode,
      detail: error.message,
      code: (error as FastifyError).code ?? 'REQUISICAO_INVALIDA',
    });
  }

  request.log.error({ err: error }, 'Erro não tratado');
  return enviarProblema(reply, {
    type: `${TIPO_BASE}/erro-interno`,
    title: 'Erro interno do servidor.',
    status: 500,
    detail: 'Ocorreu um erro inesperado ao processar a requisição.',
    code: 'ERRO_INTERNO',
  });
}
