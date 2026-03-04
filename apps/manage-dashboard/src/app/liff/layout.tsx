import type { Metadata } from 'next'
import { ToastProvider } from '@/components/ui/ToastProvider'

export const metadata: Metadata = {
  title: '94Manage 聯絡簿',
  description: '補習班聯絡簿詳情',
}

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="antialiased bg-white">
        <ToastProvider position="top-center">
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
