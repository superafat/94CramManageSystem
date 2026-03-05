'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  href: string
  icon: string
  label: string
  adminOnly?: boolean
}

interface NavSeparator {
  separator: string
}

type NavEntry = NavItem | NavSeparator

const navItems: NavEntry[] = [
  { href: '/main', icon: '📸', label: '點名' },
  { href: '/dashboard', icon: '📊', label: '儀表板' },

  { separator: '教學管理' },
  { href: '/grades', icon: '📝', label: '成績管理' },
  { href: '/attendance', icon: '📅', label: '出勤紀錄' },
  { href: '/contact-book', icon: '📓', label: '聯絡簿' },
  { href: '/makeup-classes', icon: '🔄', label: '補課管理' },

  { separator: '報表與繳費' },
  { href: '/reports', icon: '📈', label: '出勤報表' },
  { href: '/billing', icon: '💰', label: '繳費管理' },

  { separator: '系統' },
  { href: '/guide', icon: '📚', label: '使用說明' },
  { href: '/admin', icon: '⚙️', label: '系統管理', adminOnly: true },
]

function isSeparator(entry: NavEntry): entry is NavSeparator {
  return 'separator' in entry
}

export default function Sidebar() {
  const pathname = usePathname()
  const { user, school, logout } = useAuth()

  return (
    <aside
      style={{
        width: '256px',
        minWidth: '256px',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
      }}
    >
      {/* Logo & School Info */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            🐝
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              94inClass
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              蜂神榜點名系統
            </p>
          </div>
        </div>
        {(school || user) && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: 'var(--background)',
              borderRadius: '8px',
            }}
          >
            {school && (
              <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                🎒 {school.name}
              </p>
            )}
            {user && (
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: school ? '2px 0 0' : 0 }}>
                {user.name} · {user.role === 'admin' ? '管理員' : '員工'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
        {navItems.map((entry, index) => {
          if (isSeparator(entry)) {
            return (
              <div key={`sep-${index}`} style={{ padding: '16px 0 4px' }}>
                <div style={{ borderTop: '1px solid var(--border)' }} />
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                    padding: '12px 12px 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  {entry.separator}
                </p>
              </div>
            )
          }

          if (entry.adminOnly && user?.role !== 'admin') return null

          const isActive =
            pathname === entry.href ||
            (entry.href !== '/main' && entry.href !== '/dashboard' && pathname?.startsWith(entry.href))

          return (
            <Link
              key={entry.href}
              href={entry.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '10px',
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                background: isActive ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 500 : 400,
                marginBottom: '2px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{entry.icon}</span>
              <span>{entry.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <a
          href="https://94cram.com"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
        >
          🏠 返回首頁
        </a>
        <button
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 12px',
            borderRadius: '10px',
            fontSize: '13px',
            color: 'white',
            background: 'var(--primary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          🚪 登出
        </button>
      </div>
    </aside>
  )
}
