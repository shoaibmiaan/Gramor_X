import type { Meta, StoryObj } from '@storybook/react';
import { Container } from '../components/design-system/Container';

const meta: Meta<typeof Container> = {
  title: 'Layout/Container',
  component: Container,
  argTypes: { as: { control: false } },
};
export default meta;
type Story = StoryObj<typeof Container>;

export const FixedMaxWidth: Story = {
  args: {
    children: <div className="bg-white/5 rounded-xl p-6">Centered up to 7xl</div>,
  },
};

export const Fluid: Story = {
  args: {
    fluid: true,
    children: <div className="bg-white/5 rounded-xl p-6">Full width (fluid)</div>,
  },
};

export const AsMain: Story = {
  args: {
    as: 'main',
    children: <div className="bg-white/5 rounded-xl p-6">Rendered as &lt;main&gt;</div>,
  },
};
