import type { Meta, StoryObj } from '@storybook/react';

import { RewardsPanel } from '@/components/vocab/RewardsPanel';
import { rewardAttempts } from './_fixtures';

const meta: Meta<typeof RewardsPanel> = {
  title: 'Vocab/Rewards Panel',
  component: RewardsPanel,
  args: {
    xpTotal: 39,
    attempts: rewardAttempts,
  },
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof RewardsPanel>;

export const Default: Story = {};

export const FreshStart: Story = {
  args: {
    xpTotal: 0,
    attempts: {},
  },
};
