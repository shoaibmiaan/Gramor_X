import type { Meta, StoryObj } from '@storybook/react';
import { Input } from '../components/design-system/Input';

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  parameters: { layout: 'centered' },
  argTypes: {
    size: { control: 'radio', options: ['sm','md','lg'] }, // matches prop type
    required: { control: 'boolean' },
    onChange: { action: 'change' },
  },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Basic: Story = {
  args: { label: 'Email', placeholder: 'you@example.com', size: 'md' },
};

export const WithHint: Story = {
  args: {
    label: 'Username',
    placeholder: 'awesome_user',
    hint: '3–20 characters, letters and numbers',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    error: 'Must be at least 8 characters',
    required: true,
  },
};

export const WithSlots: Story = {
  args: {
    label: 'Search',
    placeholder: 'Find something…',
    leftSlot: <span role="img" aria-label="search">🔎</span>,
    rightSlot: <span role="img" aria-label="clear">✕</span>,
  },
};

export const Large: Story = {
  args: { label: 'Full name', placeholder: 'Jane Doe', size: 'lg' },
};

export const Small: Story = {
  args: { label: 'Code', placeholder: 'ABC-123', size: 'sm' },
};
