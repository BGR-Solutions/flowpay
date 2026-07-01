/**
 * Erro base do domínio. Todos os erros de regra de negócio derivam dele,
 * permitindo que a camada HTTP os traduza para respostas apropriadas.
 */
export class DomainError extends Error {
  /**
   * @param message - Mensagem descritiva do erro.
   * @param code - Código estável para consumo por clientes.
   */
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Lançado quando um recurso referenciado não existe.
 */
export class NaoEncontradoError extends DomainError {
  /**
   * @param recurso - Nome do recurso (ex.: "Atendimento").
   * @param id - Identificador procurado.
   */
  constructor(recurso: string, id: string) {
    super(`${recurso} não encontrado: ${id}`, 'NAO_ENCONTRADO');
  }
}

/**
 * Lançado quando uma operação viola uma regra/estado do domínio.
 */
export class RegraNegocioError extends DomainError {
  /**
   * @param message - Descrição da violação.
   * @param code - Código específico da regra (default: `REGRA_NEGOCIO`).
   */
  constructor(message: string, code = 'REGRA_NEGOCIO') {
    super(message, code);
  }
}
