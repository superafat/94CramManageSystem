import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '94Stock 補習班庫存管理系統 | 教材、講義、耗材管理 | 蜂神榜',
  description:
    '94Stock 是專為補習班、才藝教室設計的智能庫存管理系統，支援多校區統一管理、AI 備貨量預測、低庫存自動預警、Telegram 即時通知。與 94Manage 無縫整合，免費試用 14 天。',
  keywords:
    '補習班庫存管理, 教材管理系統, 講義庫存管理, 補習班耗材管理, 多倉庫管理, AI庫存預測, 補習班庫存軟體, 教育機構庫存, 蜂神榜, 94Stock',
  authors: [{ name: '蜂神榜 Ai 教育科技' }],
  openGraph: {
    title: '94Stock 補習班庫存管理系統 | 教材講義耗材智能管理',
    description: '多校區統一管理 · AI 備貨預測 · 低庫存自動預警 · Telegram 通知。專為教育機構設計，免費試用 14 天。',
    type: 'website',
    locale: 'zh_TW',
    siteName: '94Stock 補習班庫存管理系統',
  },
  twitter: {
    card: 'summary_large_image',
    title: '94Stock 補習班庫存管理系統',
    description: '補習班教材庫存零浪費，AI 預測備貨量，多校區一站管理',
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
