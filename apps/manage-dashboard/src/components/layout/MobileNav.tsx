'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

type Role = 'superadmin' | 'admin' | 'staff' | 'teacher' | 'parent' | 'student'

interface NavItem {
  href: string
  icon: string
  label: string
  roles: Role[]
}

// 底部導航項目（最多 5 個）
const getBottomNavItems = (role: Role): NavItem[] => {
  if (role === 'parent') {
    return [
      { href: '/my-children', icon: '👶', label: '孩子', roles: ['parent'] },
      { href: '/my-children/grades', icon: '📊', label: '成績', roles: ['parent'] },
      { href: '/my-children/billing', icon: '💰', label: '繳費', roles: ['parent'] },
    ]
  }
  if (role === 'student') {
    return [
      { href: '/my-schedule', icon: '📅', label: '課表', roles: ['student'] },
      { href: '/my-grades', icon: '📊', label: '成績', roles: ['student'] },
    ]
  }
  if (role === 'teacher') {
    return [
      { href: '/schedules', icon: '📅', label: '課表', roles: ['teacher'] },
      { href: '/attendance', icon: '✅', label: '點名', roles: ['teacher'] },
      { href: '/grades', icon: '📊', label: '成績', roles: ['teacher'] },
    ]
  }
  // admin, staff, superadmin
  return [
    { href: '/dashboard', icon: '🏠', label: '首頁', roles: ['superadmin', 'admin', 'staff'] },
    { href: '/students', icon: '👥', label: '學生', roles: ['superadmin', 'admin', 'staff'] },
    { href: '/attendance', icon: '✅', label: '點名', roles: ['superadmin', 'admin', 'staff'] },
    { href: '/billing', icon: '💰', label: '帳務', roles: ['superadmin', 'admin', 'staff'] },
    { href: '/more', icon: '☰', label: '更多', roles: ['superadmin', 'admin', 'staff'] },
  ]
}

// 更多選單項目
const getMoreMenuItems = (role: Role): NavItem[] => {
  const items: NavItem[] = []
  
  if (['superadmin', 'admin'].includes(role)) {
    items.push({ href: '/dashboard/knowledge', icon: '📚', label: '知識庫', roles: ['superadmin', 'admin'] })
    items.push({ href: '/dashboard/conversations', icon: '💬', label: '對話紀錄', roles: ['superadmin', 'admin'] })
  }
  if (['superadmin', 'admin', 'staff'].includes(role)) {
    items.push({ href: '/schedules', icon: '📅', label: '課表管理', roles: ['superadmin', 'admin', 'staff'] })
    items.push({ href: '/grades', icon: '📊', label: '成績管理', roles: ['superadmin', 'admin', 'staff'] })
  }
  if (['superadmin', 'admin'].includes(role)) {
    items.push({ href: '/reports', icon: '📈', label: '報表中心', roles: ['superadmin', 'admin'] })
  }
  // W8 講師管理
  if (['superadmin', 'admin'].includes(role)) {
    items.push({ href: '/teachers', icon: '👨‍🏫', label: '講師管理', roles: ['superadmin', 'admin'] })
    items.push({ href: '/salary', icon: '💵', label: '薪資管理', roles: ['superadmin', 'admin'] })
  }
  if (role === 'superadmin') {
    items.push({ href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['superadmin'] })
  }
  
  return items
}

interface User {
  name: string
  role: Role
}

export function MobileNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [showMore, setShowMore] = useState(false)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch {}
    }
  }, [])

  const role = (user?.role as Role) || 'student'
  const bottomItems = getBottomNavItems(role)
  const moreItems = getMoreMenuItems(role)

  // 登入頁不顯示導航
  if (pathname === '/login') return null

  return (
    <>
      {/* 更多選單 Overlay */}
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMore(false)}
        />
      )}
      
      {/* 更多選單 */}
      {showMore && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-border rounded-t-2xl z-50 p-4 pb-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">更多功能</h3>
            <button 
              onClick={() => setShowMore(false)}
              className="p-2 text-text-muted"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {moreItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMore(false)}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-hover"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs text-text-muted">{item.label}</span>
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => {
                localStorage.clear()
                setShowMore(false)
              }}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-surface-hover"
            >
              <span className="text-2xl">🚪</span>
              <span className="text-xs text-text-muted">登出</span>
            </Link>
          </div>
        </div>
      )}

      {/* 底部導航欄 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {bottomItems.map(item => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && item.href !== '/more' && pathname?.startsWith(item.href))
            const isMore = item.href === '/more'
            
            return isMore ? (
              <button
                key="more"
                onClick={() => setShowMore(!showMore)}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  showMore ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 h-full ${
                  isActive ? 'text-primary' : 'text-text-muted'
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
