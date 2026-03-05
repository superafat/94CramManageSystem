'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function MobileHeader() {
  const router = useRouter()
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.name || '')
      } catch { /* ignore */ }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <header className="sticky top-0 bg-surface border-b border-border z-20 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-semibold text-text text-sm">94BOT</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted">{userName}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-text-muted hover:text-text"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  )
}
