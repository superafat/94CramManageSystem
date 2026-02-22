import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '94 教育平台',
  description: '94cram.app — 補習班統一管理入口',
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
