'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavItem {
  href: string
  icon: string
  label: string
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { href: '/admin', icon: '📊', label: '總覽' },
  { href: '/admin/tenants', icon: '🏫', label: '補習班管理' },
  { href: '/admin/accounts', icon: '👤', label: '帳號審核' },
  { href: '/admin/trials', icon: '🎫', label: '試用管理' },
  {
    href: '/admin/finance',
    icon: '💰',
    label: '財務管理',
    children: [
      { href: '/admin/finance/subscriptions', icon: '📋', label: '收入總覽' },
      { href: '/admin/finance/costs', icon: '📤', label: '支出管理' },
      { href: '/admin/finance/reports', icon: '📑', label: '財務報表' },
    ],
  },
  { href: '/admin/knowledge', icon: '📚', label: '全域知識庫' },
  { href: '/admin/ai', icon: '🤖', label: 'AI 與 Bot 管理' },
  { href: '/admin/analytics', icon: '📈', label: '數據分析' },
  { href: '/admin/security', icon: '🔒', label: '安全監控' },
  { href: '/admin/settings', icon: '⚙️', label: '平台設定' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [financeOpen, setFinanceOpen] = useState(() => {
    return pathname?.startsWith('/admin/finance') ?? false
  })

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname?.startsWith(href) ?? false
  }

  return (
    <aside
      className="fixed left-0 top-0 w-60 h-screen flex flex-col z-30"
      style={{ backgroundColor: '#2D2D2D' }}
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#8FA895] flex items-center justify-center text-white font-bold text-base">
            🐝
          </div>
          <div>
            <h1 className="font-semibold text-sm" style={{ color: '#E8E0D8' }}>
              94cram 總後台
            </h1>
            <p className="text-xs" style={{ color: '#8a8078' }}>
              平台管理系統
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.children) {
            const isParentActive = isActive(item.href)
            return (
              <div key={item.href}>
                <button
                  onClick={() => setFinanceOpen(!financeOpen)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                  style={{
                    color: isParentActive ? '#E8E0D8' : '#a09890',
                    backgroundColor: isParentActive ? '#3D3D3D' : 'transparent',
                    borderLeft: isParentActive ? '3px solid #8FA895' : '3px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isParentActive) e.currentTarget.style.backgroundColor = '#3D3D3D'
                  }}
                  onMouseLeave={(e) => {
                    if (!isParentActive) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span className="text-base">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span
                    className="text-xs transition-transform"
                    style={{
                      transform: financeOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      color: '#8a8078',
                    }}
                  >
                    ▶
                  </span>
                </button>
                {financeOpen && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {item.children.map((child) => {
                      const childActive = isActive(child.href)
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                          style={{
                            color: childActive ? '#E8E0D8' : '#8a8078',
                            backgroundColor: childActive ? '#3D3D3D' : 'transparent',
                            borderLeft: childActive ? '2px solid #8FA895' : '2px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) e.currentTarget.style.backgroundColor = '#3D3D3D'
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                        >
                          <span className="text-sm">{child.icon}</span>
                          <span>{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                color: active ? '#E8E0D8' : '#a09890',
                backgroundColor: active ? '#3D3D3D' : 'transparent',
                borderLeft: active ? '3px solid #8FA895' : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = '#3D3D3D'
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-xs" style={{ color: '#8a8078' }}>
          94cram 總後台
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#5a5550' }}>
          v1.0.0
        </p>
      </div>
    </aside>
  )
}
