'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()

  // Public pages: no layout wrapper
  const isPublic = ['/login', '/register', '/landing'].some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
  if (isPublic) return <>{children}</>

  // Loading state
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐝</div>
          <p style={{ color: 'var(--text-secondary)' }}>載入中...</p>
        </div>
      </div>
    )
  }

  // Not logged in — let individual pages handle redirect
  if (!user) return <>{children}</>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--background)' }}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="pb-20 lg:pb-0" style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <div style={{ padding: '24px' }}>
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
