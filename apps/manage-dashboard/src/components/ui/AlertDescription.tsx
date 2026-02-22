import React from 'react'

export interface AlertDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children, className = '' }) => {
  return (
    <div className={`text-sm ${className}`}>
      {children}
    </div>
  )
}
