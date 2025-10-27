import type { Preview } from '@storybook/react';
import basePreview from './preview';
import '../styles/globals.css';
import '../styles/themes/index.css';

const preview: Preview = {
  ...basePreview,
  parameters: {
    ...basePreview.parameters,
    controls: {
      ...(basePreview.parameters?.controls || {}),
      expanded: true,
    },
  },
};

export default preview;
