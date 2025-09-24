import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/design-system/Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  parameters: { layout: 'centered' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary','secondary','outline','ghost','link','accent','warning','danger','error','success','info','subtle'],
    },
    size: { control: 'select', options: ['xs','sm','md','lg','xl'] },
    iconOnly: { control: 'boolean' },
    shape: { control: 'radio', options: ['square','circle'] },
    fullWidth: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { children: 'Primary', variant: 'primary', size: 'md' } };
export const Secondary: Story = { args: { children: 'Secondary', variant: 'secondary' } };
export const Outline: Story = { args: { children: 'Outline', variant: 'outline' } };
export const Ghost: Story = { args: { children: 'Ghost', variant: 'ghost' } };
export const Accent: Story = { args: { children: 'Accent', variant: 'accent' } };
export const Danger: Story = { args: { children: 'Delete', variant: 'danger' } };
export const LinkLike: Story = { args: { children: 'Go to Pricing', variant: 'link', href: '/pricing' } };

export const WithIcons: Story = {
  args: {
    children: 'Continue',
    variant: 'primary',
    leadingIcon: <span aria-hidden>▶</span>,
    trailingIcon: <span aria-hidden>↗</span>,
  },
};

export const IconOnlySquare: Story = {
  args: { iconOnly: true, shape: 'square', 'aria-label': 'Play', children: <span>▶</span> },
};
export const IconOnlyCircle: Story = {
  args: { iconOnly: true, shape: 'circle', 'aria-label': 'Close', children: <span>✕</span> },
};

export const FullWidth: Story = {
  args: { children: 'Full width', fullWidth: true },
  parameters: { layout: 'padded' },
};
