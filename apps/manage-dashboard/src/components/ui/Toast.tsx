/**
 * Toast Component
 * 顯示臨時通知訊息（success/error/warning/info）
 */
'use client'

import React, { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  type: ToastType
  message: string
  duration?: number
  onClose: (id: string) => void
}

const Toast: React.FC<ToastProps> = ({ 
  id, 
  type, 
  message, 
  duration = 3000, 
  onClose 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // 進場動畫
    setTimeout(() => setIsVisible(true), 10)

    // 自動關閉
    const timer = setTimeout(() => {
      handleClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      onClose(id)
    }, 300) // 等待退場動畫完成
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          icon: '✓',
          iconBg: 'bg-green-500',
          text: 'text-green-800',
        }
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: '✕',
          iconBg: 'bg-red-500',
          text: 'text-red-800',
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          icon: '⚠',
          iconBg: 'bg-yellow-500',
          text: 'text-yellow-800',
        }
      case 'info':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: 'ℹ',
          iconBg: 'bg-blue-500',
          text: 'text-blue-800',
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        min-w-[300px] max-w-md
        transition-all duration-300 ease-out
        ${styles.bg}
        ${isVisible && !isExiting 
          ? 'opacity-100 translate-x-0' 
          : 'opacity-0 translate-x-full'
        }
      `}
      role="alert"
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
        text-white text-sm font-bold
        ${styles.iconBg}
      `}>
        {styles.icon}
      </div>

      {/* Message */}
      <p className={`flex-1 text-sm font-medium ${styles.text}`}>
        {message}
      </p>

      {/* Close button */}
      <button
        onClick={handleClose}
        className={`
          flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600
          transition-colors
        `}
        aria-label="關閉"
      >
        <svg 
          className="w-4 h-4" 
          fill="none" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default Toast
