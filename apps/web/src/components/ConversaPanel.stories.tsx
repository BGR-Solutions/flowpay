import type { Meta, StoryObj } from '@storybook/react';
import { atendimentoFixture, mensagemFixture } from '../stories/fixtures.js';
import { ConversaPanel } from './ConversaPanel.js';

const meta: Meta<typeof ConversaPanel> = {
  title: 'Dashboard/ConversaPanel',
  component: ConversaPanel,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 380, height: 520 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ConversaPanel>;

/** Conversa em andamento com mensagens nos dois sentidos. */
export const EmAndamento: Story = {
  args: {
    atendimento: atendimentoFixture({ status: 'EM_ATENDIMENTO' }),
    mensagens: [
      mensagemFixture({ id: 'm1', direcao: 'IN', texto: 'Meu cartão foi bloqueado.' }),
      mensagemFixture({ id: 'm2', direcao: 'OUT', texto: 'Olá! Vou verificar isso para você.' }),
      mensagemFixture({ id: 'm3', direcao: 'IN', texto: 'Obrigado!' }),
    ],
    onResponder: () => undefined,
    onFechar: () => undefined,
  },
};

/** Conversa sem histórico (recém-alocada). */
export const SemMensagens: Story = {
  args: {
    atendimento: atendimentoFixture({ status: 'EM_ATENDIMENTO' }),
    mensagens: [],
    onResponder: () => undefined,
    onFechar: () => undefined,
  },
};

/** Atendimento encerrado: composição de resposta desabilitada. */
export const Encerrado: Story = {
  args: {
    atendimento: atendimentoFixture({ status: 'FINALIZADO' }),
    mensagens: [mensagemFixture({ id: 'm1', direcao: 'IN', texto: 'Resolvido, obrigado.' })],
    onResponder: () => undefined,
    onFechar: () => undefined,
  },
};
