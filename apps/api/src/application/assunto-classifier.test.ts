import { describe, expect, it } from 'vitest';
import { classificarAssunto } from './assunto-classifier.js';

describe('classificarAssunto', () => {
  it.each([
    ['1', 'PROBLEMA_CARTAO'],
    ['Estou com problema no meu cartão', 'PROBLEMA_CARTAO'],
    ['CARTAO bloqueado', 'PROBLEMA_CARTAO'],
    ['2', 'CONTRATACAO_EMPRESTIMO'],
    ['Quero um empréstimo', 'CONTRATACAO_EMPRESTIMO'],
    ['preciso de crédito', 'CONTRATACAO_EMPRESTIMO'],
    ['3', 'OUTRO'],
    ['Qualquer outra coisa', 'OUTRO'],
  ] as const)('classifica "%s" como %s', (texto, esperado) => {
    expect(classificarAssunto(texto)).toBe(esperado);
  });
});
