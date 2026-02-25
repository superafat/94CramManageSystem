'use client'
import './globals.css'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const publicPaths = ['/login', '/register', '/landing', '/']
    if (!loading && !user && !publicPaths.includes(pathname)) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

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
        <title>94inClass 補習班點名系統 | NFC點名、AI臉辨、LINE通知 | 蜂神榜</title>
        <meta name="description" content="94inClass 是專為補習班設計的智能點名系統，支援 NFC 刷卡點名（1秒完成）、AI 臉部辨識防代簽、LINE 家長即時通知。免硬體費用，月訂閱制，30 天免費試用，500+ 補習班使用。" />
        <meta name="keywords" content="補習班點名系統, NFC點名, AI臉部辨識, LINE家長通知, 補習班管理系統, 點名軟體, 學生出勤管理, 安親班點名, 才藝教室點名, 蜂神榜, 94inClass" />
        <meta name="author" content="蜂神榜 Ai 教育科技" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="94inClass 補習班點名系統 | NFC點名 + AI臉辨 + LINE通知" />
        <meta property="og:description" content="NFC 刷卡 1 秒點名，AI 臉辨防代簽，LINE 家長即時通知。免硬體費用，30 天免費試用。500+ 補習班信賴使用。" />
        <meta property="og:site_name" content="94inClass 補習班點名系統" />
        <meta property="og:locale" content="zh_TW" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="94inClass 補習班點名系統" />
        <meta name="twitter:description" content="NFC點名 + AI臉辨 + LINE通知，補習班最快速的數位點名解決方案" />
        <meta name="theme-color" content="#8FA9B8" />
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
