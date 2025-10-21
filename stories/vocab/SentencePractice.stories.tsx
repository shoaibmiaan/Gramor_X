import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { SentencePractice, type SentencePracticeProps } from '@/components/vocab/SentencePractice';
import { sampleWord } from './_fixtures';

const meta: Meta<typeof SentencePractice> = {
  title: 'Vocab/Sentence Practice',
  component: SentencePractice,
  args: {
    word: sampleWord,
    onComplete: action('onComplete'),
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof SentencePractice>;

export const Default: Story = {};

export const WithoutWord: Story = {
  args: {
    word: null,
  } as SentencePracticeProps,
};
