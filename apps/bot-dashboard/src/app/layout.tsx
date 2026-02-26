import type { Metadata } from 'next'
import { Noto_Sans_TC } from 'next/font/google'
import './globals.css'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: '蜂神榜 補習班 Ai 助手系統 | 千里眼 x 順風耳 補習班智慧雙引擎',
  description:
    '蜂神榜 補習班 Ai 助手系統 是補習班專屬 Telegram AI 助手。千里眼協助老師用自然語言操作點名、繳費、庫存；順風耳讓家長即時掌握孩子出缺勤與成績。免費開始使用。',
  keywords:
    '補習班AI助手, Telegram機器人, 補習班管理, 自然語言操作, 家長通知, 出缺勤查詢, 成績推播, 蜂神榜 補習班 Ai 助手系統, 千里眼, 順風耳, 蜂神榜',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '蜂神榜 補習班 Ai 助手系統 | 千里眼 x 順風耳',
    description: '補習班智慧雙引擎 — 千里眼讓老師用對話操作系統，順風耳讓家長即時掌握孩子動態。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蜂神榜 補習班 Ai 助手系統',
  },
  twitter: {
    card: 'summary_large_image',
    title: '蜂神榜 補習班 Ai 助手系統',
    description: '補習班 Telegram AI 雙 Bot — 千里眼管理操作 + 順風耳家長服務',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className={`${notoSansTC.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}
