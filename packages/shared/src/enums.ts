/**
 * Tipos de time de atendimento previstos pela política de distribuição da
 * FlowPay.
 *
 * - `CARTOES`: solicitações de "Problemas com cartão".
 * - `EMPRESTIMOS`: solicitações de "Contratação de empréstimo".
 * - `OUTROS`: qualquer outro assunto (fallback obrigatório).
 */
export const TIPOS_TIME = ['CARTOES', 'EMPRESTIMOS', 'OUTROS'] as const;

/**
 * União literal derivada de {@link TIPOS_TIME}.
 */
export type TipoTime = (typeof TIPOS_TIME)[number];

/**
 * Assuntos possíveis de uma solicitação de atendimento.
 *
 * O assunto é a chave de roteamento: define para qual {@link TipoTime} o
 * atendimento é encaminhado.
 */
export const ASSUNTOS = ['PROBLEMA_CARTAO', 'CONTRATACAO_EMPRESTIMO', 'OUTRO'] as const;

/**
 * União literal derivada de {@link ASSUNTOS}.
 */
export type Assunto = (typeof ASSUNTOS)[number];

/**
 * Estados do ciclo de vida de um atendimento.
 *
 * Transições válidas:
 * - `AGUARDANDO -> EM_ATENDIMENTO -> FINALIZADO`
 * - `AGUARDANDO -> ABANDONADO` (cliente desiste enquanto aguarda na fila).
 */
export const STATUS_ATENDIMENTO = [
  'AGUARDANDO',
  'EM_ATENDIMENTO',
  'FINALIZADO',
  'ABANDONADO',
] as const;

/**
 * União literal derivada de {@link STATUS_ATENDIMENTO}.
 */
export type StatusAtendimento = (typeof STATUS_ATENDIMENTO)[number];

/**
 * Canais de origem/destino de um atendimento.
 *
 * - `API`: criado diretamente via REST.
 * - `WHATSAPP`: originado de uma mensagem de WhatsApp (real ou simulado).
 */
export const CANAIS = ['API', 'WHATSAPP'] as const;

/**
 * União literal derivada de {@link CANAIS}.
 */
export type Canal = (typeof CANAIS)[number];

/**
 * Direção de uma mensagem trocada com o cliente.
 *
 * - `IN`: recebida do cliente.
 * - `OUT`: enviada ao cliente.
 */
export const DIRECOES_MENSAGEM = ['IN', 'OUT'] as const;

/**
 * União literal derivada de {@link DIRECOES_MENSAGEM}.
 */
export type DirecaoMensagem = (typeof DIRECOES_MENSAGEM)[number];

/**
 * Mapeia um {@link Assunto} para o {@link TipoTime} responsável.
 *
 * Qualquer assunto diferente dos dois principais recai em `OUTROS`, garantindo
 * que nenhuma solicitação fique sem time.
 *
 * @param assunto - Assunto da solicitação.
 * @returns O tipo de time responsável pelo assunto.
 */
export function resolverTipoTime(assunto: Assunto): TipoTime {
  switch (assunto) {
    case 'PROBLEMA_CARTAO':
      return 'CARTOES';
    case 'CONTRATACAO_EMPRESTIMO':
      return 'EMPRESTIMOS';
    default:
      return 'OUTROS';
  }
}
