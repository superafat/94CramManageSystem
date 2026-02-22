/**
 * Storybook stories for Card component
 * 
 * Note: Install Storybook to use these stories:
 * npx storybook@latest init
 */

// @ts-nocheck - Storybook types not installed yet
import type { Meta, StoryObj } from '@storybook/react'
import { Card } from './Card'
import { Button } from './Button'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Card>

export const Basic: Story = {
  args: {
    children: (
      <p className="text-gray-600">
        This is a basic card with some content inside.
      </p>
    ),
  },
}

export const WithTitle: Story = {
  args: {
    title: 'Card Title',
    children: (
      <p className="text-gray-600">
        This card has a title at the top.
      </p>
    ),
  },
}

export const WithFooter: Story = {
  args: {
    title: 'Card with Footer',
    children: (
      <p className="text-gray-600">
        This card has both a title and a footer.
      </p>
    ),
    footer: (
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm">Cancel</Button>
        <Button variant="primary" size="sm">Confirm</Button>
      </div>
    ),
  },
}

export const Complete: Story = {
  args: {
    title: 'User Profile',
    children: (
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-gray-900">Name</h4>
          <p className="text-gray-600">John Doe</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">Email</h4>
          <p className="text-gray-600">john@example.com</p>
        </div>
      </div>
    ),
    footer: (
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">Last updated: 2 hours ago</span>
        <Button variant="primary" size="sm">Edit Profile</Button>
      </div>
    ),
  },
}
