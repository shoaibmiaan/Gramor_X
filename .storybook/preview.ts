import type { Preview } from '@storybook/react';

// Load your globals so Tailwind + tokens apply inside SB
import '../styles/globals.css';

const viewports = {
  mobileSmall: {
    name: 'Mobile Small',
    styles: { width: '320px', height: '568px' }
  },
  mobileLarge: {
    name: 'Mobile Large',
    styles: { width: '414px', height: '896px' }
  },
  tablet: {
    name: 'Tablet',
    styles: { width: '768px', height: '1024px' }
  },
  laptop: {
    name: 'Laptop',
    styles: { width: '1280px', height: '720px' }
  },
  desktop: {
    name: 'Desktop',
    styles: { width: '1440px', height: '900px' }
  }
} as const;

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      expanded: true,
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    layout: 'padded',
    viewport: {
      viewports,
      defaultViewport: 'desktop'
    }
  }
};

export default preview;
