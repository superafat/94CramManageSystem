'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileDrawer } from './MobileDrawer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

// 不需要 shell layout 的路徑（公開頁 + 獨立環境）
const PUBLIC_PATHS = ['/login', '/demo', '/trial-signup', '/landing', '/guide', '/liff', '/bind']

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isPublicPath = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  // 同步初始化：避免每次導航都出現 spinner flash
  const [authorized, setAuthorized] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!localStorage.getItem('user')
  })
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 所有 hooks 必須在條件式 return 之前 — 修正 Rules of Hooks 違規
  useEffect(() => {
    if (isPublicPath) return
    const user = localStorage.getItem('user')
    if (!user) {
      router.push('/login')
      return
    }
    setAuthorized(true)
  }, [pathname, router, isPublicPath])

  // 公開頁：直接渲染，不套 shell
  if (isPublicPath) return <>{children}</>

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* 桌面版：側邊欄 */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* 手機版：頂部 Header */}
        <div className="lg:hidden">
          <MobileHeader onMenuOpen={() => setDrawerOpen(true)} />
        </div>

        {/* 手機版：抽屜導航 */}
        <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {/* 主內容區 */}
        <main className="lg:ml-64 pb-4 lg:pb-0">
          <div className="p-4 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
