import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '蜂神榜 Ai 教育管理平台 | 補習班管理、點名、庫存、AI 助手一站整合',
  description:
    '蜂神榜 Ai 教育管理平台整合四大系統：94Manage 補習班學員管理、94inClass AI 點名系統、94Stock 教材庫存管理、94CramBot Telegram AI 助手。專為台灣補習班、才藝教室、連鎖教育機構設計，免費試用。',
  keywords:
    '補習班管理系統, 補習班點名系統, 補習班庫存管理, 補習班AI助手, Telegram機器人, 學員管理系統, NFC點名, AI點名, 教育管理平台, 補習班軟體, 才藝教室管理, 安親班管理, 蜂神榜, 94cram, 94CramBot',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '蜂神榜 Ai 教育管理平台 | 補習班管理、點名、庫存、AI 助手四合一',
    description: '四大系統一站整合，從學員報名到教材管理全面數位化。Telegram AI 助手讓你用對話操作系統。500+ 補習班信賴使用。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '蜂神榜 Ai 教育管理平台',
  },
  twitter: {
    card: 'summary_large_image',
    title: '蜂神榜 Ai 教育管理平台',
    description: '補習班管理、點名、庫存、AI 助手四合一解決方案',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-morandi-bg">
        {children}
      </body>
    </html>
  );
}
