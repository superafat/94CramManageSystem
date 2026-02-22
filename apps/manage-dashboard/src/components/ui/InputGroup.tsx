import React from 'react'

export interface InputGroupProps {
  children: React.ReactNode
  label?: string
  error?: string
  helperText?: string
  className?: string
  orientation?: 'horizontal' | 'vertical'
}

export function InputGroup({
  children,
  label,
  error,
  helperText,
  className = '',
  orientation = 'horizontal',
}: InputGroupProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <div
        className={`
          flex gap-2
          ${orientation === 'vertical' ? 'flex-col' : 'flex-row items-center'}
        `}
      >
        {children}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  )
}
