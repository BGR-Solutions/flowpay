import type { Meta, StoryObj } from '@storybook/react';
import { SlaPanel } from './SlaPanel.js';

const meta: Meta<typeof SlaPanel> = {
  title: 'Dashboard/SlaPanel',
  component: SlaPanel,
};
export default meta;

type Story = StoryObj<typeof SlaPanel>;

/** Operação saudável, com baixa taxa de abandono. */
export const Saudavel: Story = {
  args: {
    sla: {
      esperaP50Segundos: 12,
      esperaP95Segundos: 45,
      atendimentoP50Segundos: 180,
      atendimentoP95Segundos: 420,
      primeiraRespostaMedioSegundos: 20,
      taxaAbandonoFila: 0.03,
    },
    abandonados: 2,
  },
};

/** Fila sob pressão, com espera e abandono elevados. */
export const SobPressao: Story = {
  args: {
    sla: {
      esperaP50Segundos: 90,
      esperaP95Segundos: 320,
      atendimentoP50Segundos: 240,
      atendimentoP95Segundos: 900,
      primeiraRespostaMedioSegundos: 75,
      taxaAbandonoFila: 0.28,
    },
    abandonados: 14,
  },
};
