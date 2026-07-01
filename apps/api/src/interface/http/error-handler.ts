import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError, NaoEncontradoError } from '../../domain/errors.js';

/**
 * Handler global de erros: traduz erros de domínio e de validação em respostas
 * HTTP consistentes, evitando vazar detalhes internos.
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
    return reply.status(400).send({
      code: 'VALIDACAO',
      message: 'Dados inválidos.',
      detalhes: error.issues,
    });
  }

  if (error instanceof NaoEncontradoError) {
    return reply.status(404).send({ code: error.code, message: error.message });
  }

  if (error instanceof DomainError) {
    return reply.status(409).send({ code: error.code, message: error.message });
  }

  request.log.error({ err: error }, 'Erro não tratado');
  return reply.status(500).send({ code: 'ERRO_INTERNO', message: 'Erro interno do servidor.' });
}
