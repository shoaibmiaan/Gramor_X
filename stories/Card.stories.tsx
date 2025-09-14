import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardContent, CardFooter } from '../components/design-system/Card';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  parameters: { layout: 'centered' },
  argTypes: {
    padding: { control: 'radio', options: ['none','sm','md','lg'] },
    interactive: { control: 'boolean' },
    insetBorder: { control: 'boolean' },
    as: { control: false },
  },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Surface: Story = {
  args: {
    padding: 'md',
    children: (
      <CardContent>
        Regular card content with md padding.
      </CardContent>
    ),
  },
};

export const WithHeaderAndFooter: Story = {
  args: {
    padding: 'none',
    insetBorder: true,
    children: (
      <>
        <CardHeader>Card title</CardHeader>
        <CardContent>
          <p>Body with <strong>CardContent</strong>.</p>
        </CardContent>
        <CardFooter>
          <button className="px-3 py-1 rounded bg-primary text-white">Action</button>
        </CardFooter>
      </>
    ),
  },
};

export const InteractiveHover: Story = {
  args: {
    interactive: true,
    children: <CardContent>Hover me (slight translateY)</CardContent>,
  },
};

export const AsSection: Story = {
  args: {
    as: 'section',
    children: <CardContent>Rendered as &lt;section&gt;</CardContent>,
  },
};
