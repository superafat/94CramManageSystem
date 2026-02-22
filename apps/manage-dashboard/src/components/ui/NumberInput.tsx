import React from 'react'

export interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  error?: string
  helperText?: string
  value?: number | string
  onChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  allowDecimal?: boolean
  allowNegative?: boolean
}

export function NumberInput({ 
  label, 
  error, 
  helperText, 
  className = '', 
  id,
  value,
  onChange,
  min,
  max,
  step = 1,
  allowDecimal = false,
  allowNegative = true,
  disabled,
  ...props 
}: NumberInputProps) {
  const inputId = id || `number-input-${Math.random().toString(36).substr(2, 9)}`
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // Allow empty input
    if (inputValue === '' || inputValue === '-') {
      onChange?.(null)
      return
    }

    let numValue = allowDecimal ? parseFloat(inputValue) : parseInt(inputValue, 10)
    
    // Validate number
    if (isNaN(numValue)) {
      return
    }

    // Apply constraints
    if (!allowNegative && numValue < 0) {
      numValue = 0
    }

    if (min !== undefined && numValue < min) {
      numValue = min
    }

    if (max !== undefined && numValue > max) {
      numValue = max
    }

    onChange?.(numValue)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    
    // If empty or just a minus sign, reset to 0 or min
    if (inputValue === '' || inputValue === '-') {
      const defaultValue = min !== undefined ? min : 0
      onChange?.(defaultValue)
    }

    props.onBlur?.(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent decimal point if not allowed
    if (!allowDecimal && e.key === '.') {
      e.preventDefault()
    }

    // Prevent minus sign if not allowed
    if (!allowNegative && e.key === '-') {
      e.preventDefault()
    }

    props.onKeyDown?.(e)
  }

  const increment = () => {
    const currentValue = typeof value === 'number' ? value : 0
    const newValue = currentValue + step
    
    if (max !== undefined && newValue > max) {
      return
    }

    onChange?.(newValue)
  }

  const decrement = () => {
    const currentValue = typeof value === 'number' ? value : 0
    const newValue = currentValue - step
    
    if (min !== undefined && newValue < min) {
      return
    }

    if (!allowNegative && newValue < 0) {
      return
    }

    onChange?.(newValue)
  }

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`
            w-full px-3 py-2 pr-16 border rounded-md
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:bg-gray-100 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}
            ${className}
          `}
          {...props}
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            onClick={increment}
            disabled={disabled || (max !== undefined && typeof value === 'number' && value >= max)}
            className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increment"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || (min !== undefined && typeof value === 'number' && value <= min) || (!allowNegative && typeof value === 'number' && value <= 0)}
            className="px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrement"
          >
            ▼
          </button>
        </div>
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
