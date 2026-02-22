import React from 'react'
import { useDropdown } from './useDropdown'

export interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
  onOpenChange?: (isOpen: boolean) => void
}

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  disabled?: boolean
  danger?: boolean
}

export interface DropdownSeparatorProps {
  className?: string
}

const alignmentStyles = {
  left: 'left-0',
  right: 'right-0',
  center: 'left-1/2 -translate-x-1/2',
}

export function Dropdown({ 
  trigger, 
  children, 
  align = 'left',
  className = '',
  onOpenChange 
}: DropdownProps) {
  const { isOpen, toggle, triggerRef, contentRef } = useDropdown({ onOpenChange })

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        onClick={toggle}
        type="button"
        className="inline-flex items-center justify-center"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          ref={contentRef}
          className={`absolute z-50 mt-2 min-w-[12rem] rounded-md border border-gray-200 bg-white py-1 shadow-lg ${alignmentStyles[align]}`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ 
  children, 
  disabled = false,
  danger = false,
  onClick,
  className = '',
  ...props 
}: DropdownItemProps) {
  const baseStyles = 'block w-full px-4 py-2 text-left text-sm transition-colors'
  const hoverStyles = disabled 
    ? 'cursor-not-allowed opacity-50' 
    : danger
    ? 'hover:bg-red-50 hover:text-red-600 cursor-pointer'
    : 'hover:bg-gray-100 cursor-pointer'
  const textColor = danger ? 'text-red-600' : 'text-gray-700'

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!disabled && onClick) {
      onClick(e)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`${baseStyles} ${hoverStyles} ${textColor} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function DropdownSeparator({ className = '' }: DropdownSeparatorProps) {
  return <div className={`my-1 h-px bg-gray-200 ${className}`} />
}
