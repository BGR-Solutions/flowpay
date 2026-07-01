import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AtendenteBar } from './AtendenteBar.js';

describe('AtendenteBar', () => {
  it('exibe nome e razão carga/capacidade', () => {
    render(<AtendenteBar nome="Ana" carga={2} capacidade={3} />);
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByLabelText('2 de 3')).toBeInTheDocument();
  });
});
