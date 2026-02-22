'use client'
import './globals.css'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const publicPaths = ['/login', '/register', '/landing', '/']
    if (!loading && !token && !publicPaths.includes(pathname)) {
      // 未登入且訪問受保護路徑 → 導向登入
      router.push('/login')
    }
  }, [token, loading, pathname, router])

  if (loading) {
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

  return <>{children}</>
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <head>
        <title>蜂神榜 Ai 點名系統 - AI 驅動的補習班管理系統 | NFC 點名 | 臉部辨識</title>
        <meta name="description" content="蜂神榜 Ai 點名系統是專為補習班設計的雲端管理系統。支援 NFC 點名、蜂神榜 AI AI 臉部辨識、LINE 家長通知。免硬體費用，月訂閱制，30 天免費試用。" />
        <meta name="keywords" content="補習班管理系統,點名系統,NFC點名,臉部辨識,學生管理,補習班軟體,安親班管理,教室管理,蜂神榜" />
        <meta name="author" content="蜂神榜" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="蜂神榜 Ai 點名系統 - AI 驅動的補習班管理系統" />
        <meta property="og:description" content="NFC 點名 + AI 臉辨 + LINE 通知。免硬體費用，月訂閱制，30 天免費試用。" />
        <meta property="og:url" content="https://beeclass-dashboard-855393865280.asia-east1.run.app" />
        <meta property="og:site_name" content="蜂神榜 Ai 點名系統" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="蜂神榜 Ai 點名系統" />
        <meta name="twitter:description" content="AI 驅動的補習班管理系統 - NFC 點名、臉部辨識、LINE 通知" />
        
        {/* 其他 */}
        <meta name="theme-color" content="#8FA9B8" />
        <link rel="canonical" content="https://beeclass-dashboard-855393865280.asia-east1.run.app" />
      </head>
      <body>
        <AuthProvider>
          <RouteGuard>
            {children}
          </RouteGuard>
        </AuthProvider>
      </body>
    </html>
  )
}
