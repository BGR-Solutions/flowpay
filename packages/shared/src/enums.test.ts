import { describe, expect, it } from 'vitest';
import { resolverTipoTime } from './enums.js';

describe('resolverTipoTime', () => {
  it('mapeia PROBLEMA_CARTAO para CARTOES', () => {
    expect(resolverTipoTime('PROBLEMA_CARTAO')).toBe('CARTOES');
  });

  it('mapeia CONTRATACAO_EMPRESTIMO para EMPRESTIMOS', () => {
    expect(resolverTipoTime('CONTRATACAO_EMPRESTIMO')).toBe('EMPRESTIMOS');
  });

  it('mapeia demais assuntos para OUTROS', () => {
    expect(resolverTipoTime('OUTRO')).toBe('OUTROS');
  });
});
