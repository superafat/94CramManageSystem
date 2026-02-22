import React from 'react'

export interface SpinnerProps {
  /** 尺寸大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 顏色 */
  color?: string
  /** 自訂類名 */
  className?: string
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4'
}

/**
 * Spinner 載入中元件
 */
export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'md', 
  color = 'border-blue-500',
  className = '' 
}) => {
  return (
    <div
      className={`${sizeClasses[size]} ${color} border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="載入中"
    >
      <span className="sr-only">載入中...</span>
    </div>
  )
}

export default Spinner
