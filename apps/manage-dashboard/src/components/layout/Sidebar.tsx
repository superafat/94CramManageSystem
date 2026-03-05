'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// 角色權限定義
// superadmin = 系統管理員（您）, admin = 館長（業者）
type Role = 'superadmin' | 'admin' | 'staff' | 'teacher'

interface NavItem {
  href?: string
  icon?: string
  label?: string
  type?: 'separator'
  separator?: string
  roles: Role[] // 哪些角色可以看到
}

// 選單項目與權限對照
// 知識庫 → 已移至總後台 (Portal)
// 對話紀錄 → 已移至 94BOT (bot-gateway)
// 家長/學生專區 → 已移至 94inClass
const navItems: NavItem[] = [
  // 行政總覽
  { href: '/dashboard', icon: '📊', label: '總覽', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/headquarters', icon: '🏢', label: '總部管理', roles: ['superadmin'] },
  { href: '/dashboard/audit', icon: '📋', label: '異動日誌', roles: ['superadmin', 'admin'] },
  { href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['superadmin'] },

  // 班務管理區塊
  { type: 'separator', separator: '班務管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/students', icon: '👥', label: '學生管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/finance', icon: '💰', label: '帳務管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/reports', icon: '📈', label: '報表中心', roles: ['superadmin', 'admin'] },
  { href: '/enrollment', icon: '🎪', label: '招生管理', roles: ['superadmin', 'admin'] },

  // 講師管理區塊 (W8)
  { type: 'separator', separator: '講師管理', roles: ['superadmin', 'admin'] },
  { href: '/teachers', icon: '👨‍🏫', label: '講師名單', roles: ['superadmin', 'admin'] },
  { href: '/scheduling-center', icon: '📅', label: '排課中心', roles: ['superadmin', 'admin'] },
  { href: '/schedules', icon: '📅', label: '課表管理', roles: ['superadmin', 'admin'] },
  { href: '/teacher-attendance', icon: '🕐', label: '師資出缺勤', roles: ['superadmin', 'admin'] },
  { href: '/my-salary', icon: '💵', label: '我的薪資條', roles: ['staff', 'teacher'] },
]

// 角色名稱對照
const roleLabels: Record<Role, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '教師',
}

interface User {
  id: string
  name: string
  role: Role
  tenant_id: string
  branch_id?: string
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
  
  // 過濾出當前角色可見的選單項目
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('branchId')
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 w-64 bg-surface border-r border-border h-screen flex flex-col z-30">
      {/* Logo & User Info */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg">
            🐝
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

      {/* Navigation */}
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

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-2">
        {/* 角色標籤 */}
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
