import { ASSUNTOS, CANAIS, STATUS_ATENDIMENTO } from '@flowpay/shared';
import { z } from 'zod';

/**
 * Schema de validação do corpo de `POST /atendimentos`.
 */
export const criarAtendimentoSchema = z.object({
  clienteId: z.string().min(1),
  clienteNome: z.string().min(1).optional(),
  assunto: z.enum(ASSUNTOS),
  canal: z.enum(CANAIS).optional(),
});

/**
 * Schema de validação do corpo de `POST /atendimentos/:id/mensagens`.
 */
export const enviarMensagemSchema = z.object({
  texto: z.string().min(1),
});

/**
 * Schema de validação do corpo de `POST /simular/whatsapp/mensagem`.
 */
export const simularMensagemSchema = z.object({
  clienteId: z.string().min(1),
  texto: z.string().min(1),
  clienteNome: z.string().min(1).optional(),
});

/**
 * Schema de validação da query de `GET /atendimentos`.
 */
export const filtroAtendimentosSchema = z.object({
  status: z.enum(STATUS_ATENDIMENTO).optional(),
  timeId: z.string().min(1).optional(),
});

/**
 * Schema de validação de parâmetro de rota `:id`.
 */
export const idParamSchema = z.object({
  id: z.string().min(1),
});
