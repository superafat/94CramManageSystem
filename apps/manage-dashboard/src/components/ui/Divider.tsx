import React from 'react'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
  spacing?: 'sm' | 'md' | 'lg'
}

const spacingStyles = {
  horizontal: {
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
  },
  vertical: {
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
  },
}

export function Divider({ 
  orientation = 'horizontal', 
  className = '',
  spacing = 'md'
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div 
        className={`
          w-px bg-gray-200 self-stretch
          ${spacingStyles.vertical[spacing]}
          ${className}
        `}
        role="separator"
        aria-orientation="vertical"
      />
    )
  }

  return (
    <hr 
      className={`
        border-0 border-t border-gray-200
        ${spacingStyles.horizontal[spacing]}
        ${className}
      `}
      role="separator"
      aria-orientation="horizontal"
    />
  )
}
