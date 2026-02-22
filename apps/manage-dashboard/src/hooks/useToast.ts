/**
 * useToast Hook
 * 提供便捷的方法來顯示 Toast 通知
 */
'use client'

import { useState, useCallback } from 'react'
import { ToastType } from '../components/ui/Toast'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

let toastId = 0

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback((
    type: ToastType,
    message: string,
    duration: number = 3000
  ) => {
    const id = `toast-${++toastId}`
    const newToast: ToastMessage = {
      id,
      type,
      message,
      duration,
    }

    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const success = useCallback((message: string, duration?: number) => {
    return addToast('success', message, duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    return addToast('error', message, duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    return addToast('warning', message, duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    return addToast('info', message, duration)
  }, [addToast])

  return {
    toasts,
    success,
    error,
    warning,
    info,
    removeToast,
  }
}
