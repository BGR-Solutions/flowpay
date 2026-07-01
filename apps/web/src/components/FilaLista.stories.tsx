import type { Meta, StoryObj } from '@storybook/react';
import { atendimentoFixture } from '../stories/fixtures.js';
import { FilaLista } from './FilaLista.js';

const meta: Meta<typeof FilaLista> = {
  title: 'Dashboard/FilaLista',
  component: FilaLista,
};
export default meta;

type Story = StoryObj<typeof FilaLista>;

/** Fila vazia. */
export const Vazia: Story = {
  args: { itens: [] },
};

/** Fila com alguns clientes aguardando. */
export const ComEspera: Story = {
  args: {
    itens: [
      atendimentoFixture({ id: 'f1', clienteNome: 'João' }),
      atendimentoFixture({ id: 'f2', clienteNome: 'Maria' }),
      atendimentoFixture({ id: 'f3', clienteNome: 'Pedro' }),
    ],
  },
};
