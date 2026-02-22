import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata: Metadata = {
  title: '蜂神榜 Ai 補習班管理系統',
  description: '蜂神榜 Ai 補習班管理系統是專為補習班設計的管理系統，提供出勤管理、成績管理、帳務管理、薪資計算、AI 流失預警等功能。與蜂神榜 Ai 補習班點名系統無縫整合。',
  keywords: '補習班管理系統, 蜂神榜, 補習班點名系統, 出勤管理, 成績管理, 帳務管理, 薪資計算, AI分析, 補習班軟體',
  authors: [{ name: '蜂神榜團隊' }],
  openGraph: {
    title: '蜂神榜 Ai 補習班管理系統',
    description: '出勤管理 · 成績管理 · 帳務管理 · 薪資計算 · AI 分析，一站式解決補習班營運難題',
    type: 'website',
    locale: 'zh_TW',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <ToastProvider position="top-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
