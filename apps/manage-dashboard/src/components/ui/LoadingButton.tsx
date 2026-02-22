'use client'

import React from 'react'
import { Button, ButtonProps } from './Button'

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({ 
  loading = false,
  loadingText,
  children,
  disabled,
  className = '',
  ...props 
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={`relative ${className}`}
      {...props}
    >
      {loading && (
        <span className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
          <svg 
            className="animate-spin h-4 w-4" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          {loadingText && <span>{loadingText}</span>}
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>
        {children}
      </span>
    </Button>
  )
}
