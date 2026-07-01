import type { Meta, StoryObj } from '@storybook/react';
import { timeMetricaFixture } from '../stories/fixtures.js';
import { TimeCard } from './TimeCard.js';

const meta: Meta<typeof TimeCard> = {
  title: 'Dashboard/TimeCard',
  component: TimeCard,
};
export default meta;

type Story = StoryObj<typeof TimeCard>;

/** Time Cartões com fila. */
export const Cartoes: Story = {
  args: { metrica: timeMetricaFixture() },
};

/** Time Empréstimos ocioso, sem fila. */
export const SemFila: Story = {
  args: {
    metrica: timeMetricaFixture({
      time: {
        id: 'time-2',
        tipo: 'EMPRESTIMOS',
        nome: 'Time Empréstimos',
        atendentes: [
          { id: 'e1', nome: 'Carla', timeId: 'time-2', capacidadeMax: 3, cargaAtual: 0, atendimentosAtivos: [] },
          { id: 'e2', nome: 'Diego', timeId: 'time-2', capacidadeMax: 3, cargaAtual: 0, atendimentosAtivos: [] },
        ],
        fila: [],
      },
      ocupacao: 0,
      capacidadeTotal: 6,
      percentualOcupacao: 0,
      fila: [],
      atendentes: [
        {
          atendente: { id: 'e1', nome: 'Carla', timeId: 'time-2', capacidadeMax: 3, cargaAtual: 0, atendimentosAtivos: [] },
          carga: 0,
        },
        {
          atendente: { id: 'e2', nome: 'Diego', timeId: 'time-2', capacidadeMax: 3, cargaAtual: 0, atendimentosAtivos: [] },
          carga: 0,
        },
      ],
    }),
  },
};
