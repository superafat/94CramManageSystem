import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'
import { AppLayout } from '@/components/layout/AppLayout'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '94BOT LINE Bot 管理 | 聞太師 AI 家長助手 | 蜂神榜',
  description:
    '94BOT 是補習班專屬 LINE Bot 管理平台。AI 聞太師自動回覆家長查詢，管理家長綁定、對話紀錄、LINE 訊息額度。與 94Manage、94inClass 無縫整合。',
  keywords:
    '補習班 LINE Bot, AI 家長助手, 聞太師, LINE 機器人, 補習班通知系統, 家長溝通, 蜂神榜, 94BOT',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '94BOT LINE Bot 管理 | 聞太師 AI 家長助手',
    description: 'AI 自動回覆家長查詢、管理綁定、LINE 訊息額度購買，補習班專屬 LINE Bot 管理平台。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '94BOT LINE Bot 管理平台',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.className} antialiased`}>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
