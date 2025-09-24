import type { Preview } from '@storybook/react';

// Load your globals so Tailwind + tokens apply inside SB
import '../styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    layout: 'padded'
  }
};

export default preview;
