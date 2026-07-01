import type { Preview } from '@storybook/react';
import '../src/index.css';

/**
 * Preview global do Storybook: aplica o tema escuro e um fundo consistente com
 * o dashboard.
 */
const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'flowpay',
      values: [{ name: 'flowpay', value: '#020617' }],
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  decorators: [
    (Story) => (
      <div className="p-6 text-slate-100">
        <Story />
      </div>
    ),
  ],
};

export default preview;
