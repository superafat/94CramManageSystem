import React, { useState } from 'react'

export interface RatingProps {
  value?: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  readOnly?: boolean
  onChange?: (value: number) => void
  className?: string
  color?: string
  emptyColor?: string
}

const sizeStyles = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
}

export function Rating({
  value = 0,
  max = 5,
  size = 'md',
  readOnly = false,
  onChange,
  className = '',
  color = 'text-yellow-400',
  emptyColor = 'text-gray-300',
}: RatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)

  const handleClick = (rating: number) => {
    if (!readOnly && onChange) {
      onChange(rating)
    }
  }

  const handleMouseEnter = (rating: number) => {
    if (!readOnly) {
      setHoverValue(rating)
    }
  }

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverValue(null)
    }
  }

  const displayValue = hoverValue !== null ? hoverValue : value

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => {
        const isFilled = rating <= displayValue
        return (
          <button
            key={rating}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            onMouseLeave={handleMouseLeave}
            disabled={readOnly}
            className={`
              ${sizeStyles[size]}
              ${isFilled ? color : emptyColor}
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
              transition-all duration-150
              focus:outline-none
              disabled:cursor-default
            `}
            aria-label={`Rate ${rating} out of ${max}`}
          >
            ★
          </button>
        )
      })}
    </div>
  )
}
