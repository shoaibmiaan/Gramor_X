import type { Meta, StoryObj } from '@storybook/react';
import TokenCard from './TokenCard';

const meta: Meta<typeof TokenCard> = {
  title: 'Tokens/TokenCard',
  component: TokenCard,
  parameters: {
    layout: 'centered',
  },
};
export default meta;

type Story = StoryObj<typeof TokenCard>;
export const Default: Story = {};
