import React, { useState, useRef, useEffect } from 'react'

export interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  format?: 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  maxDate,
  className = '',
  format = 'YYYY-MM-DD',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(value || null)
  const [viewMonth, setViewMonth] = useState<Date>(value || new Date())
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) {
      setSelectedDate(value)
      setViewMonth(value)
    }
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    switch (format) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`
      case 'YYYY-MM-DD':
      default:
        return `${year}-${month}-${day}`
    }
  }

  const handleDateSelect = (date: Date) => {
    if (disabled) return
    
    if (minDate && date < minDate) return
    if (maxDate && date > maxDate) return

    setSelectedDate(date)
    onChange?.(date)
    setIsOpen(false)
  }

  const handlePrevMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const renderCalendar = () => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const daysInMonth = getDaysInMonth(viewMonth)
    const firstDay = getFirstDayOfMonth(viewMonth)
    
    const days: React.JSX.Element[] = []
    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

    // Week day headers
    weekDays.forEach(day => {
      days.push(
        <div key={`header-${day}`} className="text-center text-xs font-semibold text-gray-600 p-2">
          {day}
        </div>
      )
    })

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear()
      
      const isDisabled = 
        (minDate && date < minDate) ||
        (maxDate && date > maxDate)
      
      const isToday = 
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear()

      days.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateSelect(date)}
          disabled={isDisabled}
          className={`
            p-2 text-sm rounded-md transition-colors
            ${isSelected ? 'bg-blue-600 text-white font-semibold' : ''}
            ${isToday && !isSelected ? 'border border-blue-600 text-blue-600' : ''}
            ${!isSelected && !isToday ? 'hover:bg-gray-100 text-gray-900' : ''}
            ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {day}
        </button>
      )
    }

    return days
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={formatDate(selectedDate)}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly
        className={`
          w-full px-4 py-2 border border-gray-300 rounded-md
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          cursor-pointer
        `}
      />
      
      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-sm font-semibold">
              {monthNames[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {renderCalendar()}
          </div>
        </div>
      )}
    </div>
  )
}
