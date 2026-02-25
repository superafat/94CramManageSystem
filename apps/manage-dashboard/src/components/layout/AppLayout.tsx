'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileHeader } from './MobileHeader'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const PUBLIC_PATHS = ['/login', '/demo', '/trial-signup', '/landing', '/guide']

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)

  // Public pages don't need layout
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return <>{children}</>
  }

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!user) {
      router.push('/login')
      return
    }
    setAuthorized(true)
  }, [pathname, router])

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
          <MobileHeader />
        </div>

        {/* 主內容區 */}
        <main className="lg:ml-64 pb-20 lg:pb-0">
          <div className="p-4 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>

        {/* 手機版：底部導航 */}
        <div className="lg:hidden">
          <MobileNav />
        </div>
      </div>
    </ErrorBoundary>
  )
}
