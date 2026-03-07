'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

type Role = 'admin' | 'staff'

interface NavItem {
  href?: string
  icon?: string
  label?: string
  type?: 'separator'
  separator?: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: '總覽', roles: ['admin', 'staff'] },

  { type: 'separator', separator: 'Bot 管理', roles: ['admin', 'staff'] },
  { href: '/dashboard/clairvoyant', icon: '🔮', label: '千里眼（行政端）', roles: ['admin', 'staff'] },
  { href: '/dashboard/windear', icon: '👂', label: '順風耳（家長端）', roles: ['admin'] },
  { href: '/dashboard/ai-tutor', icon: '📐', label: '神算子（課業助教）', roles: ['admin'] },
  { href: '/dashboard/wentaishi', icon: '📖', label: '聞仲老師（LINE）', roles: ['admin'] },

  { type: 'separator', separator: '資料管理', roles: ['admin', 'staff'] },
  { href: '/dashboard/conversations', icon: '💬', label: '對話紀錄', roles: ['admin', 'staff'] },
  { href: '/dashboard/knowledge-base', icon: '📚', label: '知識庫', roles: ['admin'] },
  { href: '/dashboard/analytics', icon: '📈', label: '統計分析', roles: ['admin', 'staff'] },

  { type: 'separator', separator: '系統', roles: ['admin'] },
  { href: '/dashboard/bindings', icon: '🔗', label: '綁定管理', roles: ['admin'] },
  { href: '/dashboard/plans', icon: '💎', label: '訂閱方案', roles: ['admin'] },
  { href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['admin'] },
]

const roleLabels: Record<Role, string> = {
  admin: '館長',
  staff: '行政',
}

interface User {
  id: string
  name: string
  role: Role
  tenant_id: string
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        setUser(JSON.parse(userStr))
      } catch {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const userRole = (user?.role as Role) || 'staff'
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 w-64 bg-surface border-r border-border h-screen flex flex-col z-30">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
            🤖
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-text text-sm truncate">
              {user?.name || '載入中...'}
            </h1>
            <p className="text-xs text-text-muted">
              {roleLabels[userRole] || userRole}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item, index) => {
          if (item.type === 'separator') {
            return (
              <div key={`separator-${index}`} className="py-2">
                <div className="border-t border-border" />
                <div className="text-xs text-text-muted px-4 pt-3 pb-1 font-medium">
                  {item.separator}
                </div>
              </div>
            )
          }

          const href = item.href!
          const isActive = pathname === href ||
            (href !== '/dashboard' && pathname?.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="px-4 py-2 bg-primary/5 rounded-xl">
          <p className="text-xs text-text-muted">
            目前身份：<span className="font-medium text-primary">{roleLabels[userRole]}</span>
          </p>
        </div>

        <a
          href="https://94cram.com"
          className="w-full flex items-center gap-3 px-4 py-2 text-text-muted hover:text-text transition-colors rounded-xl hover:bg-surface-hover"
        >
          <span>🏠</span>
          <span className="text-sm">返回首頁</span>
        </a>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-text-muted hover:text-text transition-colors rounded-xl hover:bg-surface-hover"
        >
          <span>🚪</span>
          <span className="text-sm">切換帳號</span>
        </button>
      </div>
    </aside>
  )
}
