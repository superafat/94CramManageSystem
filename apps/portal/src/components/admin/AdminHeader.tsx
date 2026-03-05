'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getToken, parseToken, removeToken, type PlatformUser } from '@/lib/auth'

const pageTitles: Record<string, string> = {
  '/admin': '總覽',
  '/admin/tenants': '補習班管理',
  '/admin/accounts': '帳號審核',
  '/admin/trials': '試用管理',
  '/admin/finance': '財務管理',
  '/admin/finance/subscriptions': '收入總覽',
  '/admin/finance/costs': '支出管理',
  '/admin/finance/reports': '財務報表',
  '/admin/knowledge': '全域知識庫',
  '/admin/ai': 'AI 與 Bot 管理',
  '/admin/analytics': '數據分析',
  '/admin/security': '安全監控',
  '/admin/settings': '平台設定',
}

function getPageTitle(pathname: string | null): string {
  if (!pathname) return '總後台'
  // 精確匹配
  if (pageTitles[pathname]) return pageTitles[pathname]
  // 前綴匹配（子頁面）
  const keys = Object.keys(pageTitles).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (pathname.startsWith(key)) return pageTitles[key]
  }
  return '總後台'
}

export function AdminHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<PlatformUser | null>(null)

  useEffect(() => {
    const token = getToken()
    if (token) {
      setUser(parseToken(token))
    }
  }, [])

  const handleLogout = () => {
    removeToken()
    router.push('/admin/login')
  }

  const title = getPageTitle(pathname)

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center gap-4">
        {user && (
          <span className="text-sm text-gray-600">
            {user.name}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm px-3 py-1.5 rounded-lg transition-colors"
          style={{ color: '#B5706E' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#B5706E'
            e.currentTarget.style.color = '#fff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = '#B5706E'
          }}
        >
          登出
        </button>
      </div>
    </header>
  )
}
