'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface NavItem {
  emoji: string
  label: string
  path: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { emoji: '📸', label: '刷臉', path: '/main' },
  { emoji: '📋', label: '名單', path: '/main' },
  { emoji: '📊', label: '儀表板', path: '/dashboard' },
  { emoji: '📝', label: '成績', path: '/grades' },
  { emoji: '📈', label: '報表', path: '/reports' },
  { emoji: '💰', label: '繳費', path: '/billing' },
  { emoji: '📚', label: '說明', path: '/guide' },
  { emoji: '⚙️', label: '管理', path: '/admin', adminOnly: true },
]

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const isActive = (path: string) => pathname === path

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--surface)',
        borderTop: '2px solid var(--border)',
        padding: '12px',
        display: 'flex',
        justifyContent: 'space-around',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 100,
      }}
    >
      {NAV_ITEMS.map((item) => {
        if (item.adminOnly && user?.role !== 'admin') return null
        const active = isActive(item.path)
        return (
          <button
            key={`${item.label}-${item.path}`}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              gap: '4px',
              opacity: active ? 1 : 0.7,
              transform: active ? 'scale(1.1)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '28px' }}>{item.emoji}</div>
            <div
              style={{
                fontSize: '12px',
                color: active ? 'var(--accent)' : 'var(--primary)',
                fontWeight: 'bold',
              }}
            >
              {item.label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
