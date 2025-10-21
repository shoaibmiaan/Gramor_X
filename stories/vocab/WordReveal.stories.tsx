import type { Meta, StoryObj } from '@storybook/react';

import { WordReveal } from '@/components/vocab/WordReveal';
import { sampleWord } from './_fixtures';

const meta: Meta<typeof WordReveal> = {
  title: 'Vocab/Word Reveal',
  component: WordReveal,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof WordReveal>;

export const Default: Story = {
  args: {
    date: '2025-03-15',
    word: sampleWord,
    source: 'rpc',
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
    word: null,
  },
};

export const MissingWord: Story = {
  args: {
    word: null,
    date: '2025-03-16',
  },
};
