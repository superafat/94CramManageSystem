import React from 'react'

export interface AlertTitleProps {
  children: React.ReactNode
  className?: string
}

export const AlertTitle: React.FC<AlertTitleProps> = ({ children, className = '' }) => {
  return (
    <h5 className={`font-semibold mb-1 ${className}`}>
      {children}
    </h5>
  )
}
