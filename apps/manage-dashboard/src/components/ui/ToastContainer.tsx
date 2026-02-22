/**
 * ToastContainer Component
 * 管理和顯示多個 Toast 通知
 */
'use client'

import React from 'react'
import Toast, { ToastType } from './Toast'
import { ToastMessage } from '../../hooks/useToast'

interface ToastContainerProps {
  toasts: ToastMessage[]
  onRemove: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  onRemove,
  position = 'top-right'
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4'
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-right':
        return 'bottom-4 right-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2'
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2'
    }
  }

  if (toasts.length === 0) return null

  return (
    <div
      className={`
        fixed z-50 flex flex-col gap-3
        ${getPositionStyles()}
      `}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  )
}

export default ToastContainer
