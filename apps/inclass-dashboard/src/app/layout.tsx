import './globals.css'
import type { Metadata } from 'next'
import ClientProviders from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: '94inClass 補習班點名系統 | NFC點名、AI臉辨、LINE通知 | 蜂神榜',
  description: '94inClass 是專為補習班設計的智能點名系統，支援 NFC 刷卡點名（1秒完成）、AI 臉部辨識防代簽、LINE 家長即時通知。免硬體費用，月訂閱制，30 天免費試用，500+ 補習班使用。',
  keywords: '補習班點名系統, NFC點名, AI臉部辨識, LINE家長通知, 補習班管理系統, 點名軟體, 學生出勤管理, 安親班點名, 才藝教室點名, 蜂神榜, 94inClass',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    type: 'website',
    title: '94inClass 補習班點名系統 | NFC點名 + AI臉辨 + LINE通知',
    description: 'NFC 刷卡 1 秒點名，AI 臉辨防代簽，LINE 家長即時通知。免硬體費用，30 天免費試用。500+ 補習班信賴使用。',
    siteName: '94inClass 補習班點名系統',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: '94inClass 補習班點名系統',
    description: 'NFC點名 + AI臉辨 + LINE通知，補習班最快速的數位點名解決方案',
  },
  other: {
    'theme-color': '#8FA9B8',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
