import type { Assunto } from '@flowpay/shared';

/**
 * Classifica o assunto de uma solicitação a partir do texto livre recebido de
 * um canal (ex.: WhatsApp).
 *
 * Estratégia (fase 1): menu numérico + palavras-chave, priorizando
 * determinismo. Isolar a classificação nesta função permite trocá-la por um
 * modelo de NLP no futuro sem tocar no motor de distribuição.
 *
 * @param texto - Conteúdo enviado pelo cliente.
 * @returns O assunto identificado (`OUTRO` como fallback).
 */
export function classificarAssunto(texto: string): Assunto {
  const normalizado = texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (normalizado === '1' || /cart[ãa]o|cartao|cartoes/.test(normalizado)) {
    return 'PROBLEMA_CARTAO';
  }
  if (normalizado === '2' || /emprest|financiament|credito/.test(normalizado)) {
    return 'CONTRATACAO_EMPRESTIMO';
  }
  return 'OUTRO';
}

/**
 * Texto do menu de boas-vindas apresentado ao cliente no primeiro contato.
 */
export const MENU_BOAS_VINDAS =
  'Olá! Bem-vindo à FlowPay. Como podemos ajudar?\n' +
  '1) Problemas com cartão\n' +
  '2) Contratação de empréstimo\n' +
  '3) Outros assuntos';
