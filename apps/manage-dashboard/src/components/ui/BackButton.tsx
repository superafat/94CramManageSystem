'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  fallbackUrl?: string
  label?: string
}

export function BackButton({ fallbackUrl = '/dashboard', label = '返回' }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackUrl)
    }
  }

  // 手機版隱藏（有底部導航），桌面版顯示
  return (
    <button
      onClick={handleBack}
      className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-muted hover:text-text bg-surface border border-border rounded-lg hover:bg-surface-hover transition-all"
    >
      <span>←</span>
      <span>{label}</span>
    </button>
  )
}
