import type { Meta, StoryObj } from '@storybook/react';
import { KpiCard } from './KpiCard.js';

const meta: Meta<typeof KpiCard> = {
  title: 'Dashboard/KpiCard',
  component: KpiCard,
};
export default meta;

type Story = StoryObj<typeof KpiCard>;

/** KPI de atendimentos em andamento. */
export const EmAtendimento: Story = {
  args: { titulo: 'Em atendimento', valor: 12, destaque: 'text-emerald-400' },
};

/** KPI com sufixo de unidade. */
export const EsperaMedia: Story = {
  args: { titulo: 'Espera média', valor: 42, sufixo: 's' },
};
