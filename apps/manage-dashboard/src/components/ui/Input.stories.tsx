/**
 * Storybook stories for Input component
 * 
 * Note: Install Storybook to use these stories:
 * npx storybook@latest init
 */

// @ts-nocheck - Storybook types not installed yet
import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Input>

export const Basic: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter your username',
  },
}

export const WithHelperText: Story = {
  args: {
    label: 'Email',
    placeholder: 'example@email.com',
    helperText: 'We will never share your email with anyone.',
  },
}

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    error: 'Password must be at least 8 characters long',
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'Cannot edit this',
    disabled: true,
  },
}

export const Email: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'your.email@example.com',
    helperText: 'Enter a valid email address',
  },
}

export const Number: Story = {
  args: {
    label: 'Age',
    type: 'number',
    min: 0,
    max: 120,
    helperText: 'Enter your age',
  },
}
