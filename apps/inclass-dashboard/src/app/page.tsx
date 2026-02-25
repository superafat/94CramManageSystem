'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        // 已登入 → 點名系統
        router.push('/main')
      } else {
        // 未登入 → SEO 首頁
        router.push('/landing')
      }
    }
  }, [user, loading, router])

  // 載入中
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8DED0 0%, #D4C4B0 100%)' }}>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#D4A574' }}>
          <span className="text-3xl">🐝</span>
        </div>
        <p style={{ color: '#8B7355' }}>載入中...</p>
      </div>
    </div>
  )
}
