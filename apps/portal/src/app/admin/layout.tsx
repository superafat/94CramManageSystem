import { Noto_Sans_TC } from 'next/font/google'

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata = {
  title: '94cram 總後台',
  description: '94cram 平台管理總後台',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={notoSansTC.className}>
      {children}
    </div>
  )
}
