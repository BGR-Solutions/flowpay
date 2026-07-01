import type { Meta, StoryObj } from '@storybook/react';
import { AtendenteBar } from './AtendenteBar.js';

const meta: Meta<typeof AtendenteBar> = {
  title: 'Dashboard/AtendenteBar',
  component: AtendenteBar,
};
export default meta;

type Story = StoryObj<typeof AtendenteBar>;

/** Atendente com carga parcial. */
export const Parcial: Story = {
  args: { nome: 'Ana', carga: 1, capacidade: 3 },
};

/** Atendente lotado (destaque em vermelho). */
export const Lotado: Story = {
  args: { nome: 'Bruno', carga: 3, capacidade: 3 },
};

/** Atendente ocioso. */
export const Ocioso: Story = {
  args: { nome: 'Carla', carga: 0, capacidade: 3 },
};
