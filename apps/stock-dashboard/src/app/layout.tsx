import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '94Stock | 補習班庫存管理系統',
  description:
    '專為教育機構設計的庫存管理系統，支援多倉庫、AI 預測、Telegram 通知、94Manage 整合。免費試用 14 天。',
  keywords: '補習班, 庫存管理, 教材管理, 講義管理, 教育機構, 庫存系統',
  authors: [{ name: '94Stock' }],
  openGraph: {
    title: '94Stock | 補習班庫存管理系統',
    description: '專為教育機構設計的庫存管理解決方案',
    type: 'website',
    locale: 'zh_TW',
  },
  twitter: {
    card: 'summary_large_image',
    title: '94Stock | 補習班庫存管理系統',
    description: '專為教育機構設計的庫存管理解決方案',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
