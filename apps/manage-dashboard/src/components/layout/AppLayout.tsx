'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { MobileHeader } from './MobileHeader'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 登入頁不需要 layout
  if (pathname === '/login') {
    return <>{children}</>
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
