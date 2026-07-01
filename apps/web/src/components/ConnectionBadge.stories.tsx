import type { Meta, StoryObj } from '@storybook/react';
import { ConnectionBadge } from './ConnectionBadge.js';

const meta: Meta<typeof ConnectionBadge> = {
  title: 'Dashboard/ConnectionBadge',
  component: ConnectionBadge,
};
export default meta;

type Story = StoryObj<typeof ConnectionBadge>;

/** Conectado. */
export const Conectado: Story = { args: { conectado: true } };

/** Reconectando. */
export const Reconectando: Story = { args: { conectado: false } };
