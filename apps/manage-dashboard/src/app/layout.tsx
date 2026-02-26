import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '94Manage 補習班管理系統 | 學員管理、帳務、薪資、AI分析 | 蜂神榜',
  description:
    '94Manage 是台灣最完整的補習班管理系統，整合學員管理、出勤追蹤、成績管理、學費帳務、教師薪資計算、AI 流失預警。與 94inClass 點名系統無縫整合，30 天免費試用，300+ 補習班信賴使用。',
  keywords:
    '補習班管理系統, 學員管理系統, 補習班帳務, 補習班薪資計算, 補習班軟體, 出勤管理, 成績管理, AI流失預警, 補習班收費系統, 才藝教室管理, 安親班管理系統, 蜂神榜, 94Manage',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '94Manage 補習班管理系統 | 學員、帳務、薪資、AI 分析',
    description: '出勤管理 · 成績管理 · 帳務管理 · 薪資計算 · AI 流失預警，一站式解決補習班所有行政難題。30 天免費試用。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '94Manage 補習班管理系統',
  },
  twitter: {
    card: 'summary_large_image',
    title: '94Manage 補習班管理系統',
    description: '台灣最完整的補習班學員管理系統，AI 流失預警 + 帳務薪資全自動化',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.className} antialiased`}>
        <ToastProvider position="top-right">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
