import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { MeaningQuiz, type MeaningQuizProps } from '@/components/vocab/MeaningQuiz';
import { sampleWord } from './_fixtures';

const meta: Meta<typeof MeaningQuiz> = {
  title: 'Vocab/Meaning Quiz',
  component: MeaningQuiz,
  args: {
    onComplete: action('onComplete'),
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof MeaningQuiz>;

export const Default: Story = {
  args: {
    word: sampleWord,
  },
};

export const WithoutWord: Story = {
  args: {
    word: null,
  } as MeaningQuizProps,
};
