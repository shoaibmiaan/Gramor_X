import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from '../components/design-system/Checkbox';

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  argTypes: {
    onChange: { action: 'change' },
  },
};
export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Unchecked: Story = {
  args: {
    label: 'Subscribe to newsletter',
    description: 'No spam. Cancel anytime.',
    checked: false,
  },
};

export const Checked: Story = {
  args: {
    label: 'I agree to the terms',
    checked: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Accept privacy policy',
    error: 'You must accept to continue',
  },
};
