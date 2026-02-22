'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

// 角色權限定義
// superadmin = 系統管理員（您）, admin = 館長（業者）
type Role = 'superadmin' | 'admin' | 'staff' | 'teacher' | 'parent' | 'student'

interface NavItem {
  href?: string
  icon?: string
  label?: string
  type?: 'separator'
  separator?: string
  roles: Role[] // 哪些角色可以看到
}

// 選單項目與權限對照
const navItems: NavItem[] = [
  // AI 客服區塊 - 館長、行政
  { href: '/dashboard', icon: '📊', label: '總覽', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/dashboard/knowledge', icon: '📚', label: '知識庫', roles: ['superadmin', 'admin'] },
  { href: '/dashboard/conversations', icon: '💬', label: '對話紀錄', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/dashboard/trials', icon: '🎯', label: '試用審核', roles: ['superadmin'] }, // 只有系統管理員可見
  { href: '/dashboard/audit', icon: '📋', label: '異動日誌', roles: ['superadmin', 'admin'] },
  { href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['superadmin'] }, // 只有系統管理員可見
  
  // 班務管理區塊
  { type: 'separator', separator: '班務管理', roles: ['superadmin', 'admin', 'staff', 'teacher'] },
  { href: '/students', icon: '👥', label: '學生管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/schedules', icon: '📅', label: '課表管理', roles: ['superadmin', 'admin', 'staff', 'teacher', 'student'] },
  { href: '/attendance', icon: '✅', label: '出席管理', roles: ['superadmin', 'admin', 'staff', 'teacher'] },
  { href: '/grades', icon: '📊', label: '成績管理', roles: ['superadmin', 'admin', 'staff', 'teacher'] },
  { href: '/billing', icon: '💰', label: '帳務管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/reports', icon: '📈', label: '報表中心', roles: ['superadmin', 'admin'] },
  
  // 講師管理區塊 (W8)
  { type: 'separator', separator: '講師管理', roles: ['superadmin', 'admin'] },
  { href: '/teachers', icon: '👨‍🏫', label: '講師名單', roles: ['superadmin', 'admin'] },
  { href: '/salary', icon: '💵', label: '薪資管理', roles: ['superadmin', 'admin'] },
  
  // 家長專區
  { type: 'separator', separator: '我的孩子', roles: ['parent'] },
  { href: '/my-children', icon: '👶', label: '孩子資料', roles: ['parent'] },
  { href: '/my-children/grades', icon: '📊', label: '成績查詢', roles: ['parent'] },
  { href: '/my-children/billing', icon: '💰', label: '繳費查詢', roles: ['parent'] },
  
  // 學生專區
  { type: 'separator', separator: '我的學習', roles: ['student'] },
  { href: '/my-schedule', icon: '📅', label: '我的課表', roles: ['student'] },
  { href: '/my-grades', icon: '📊', label: '我的成績', roles: ['student'] },
]

// 角色名稱對照
const roleLabels: Record<Role, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '教師',
  parent: '家長',
  student: '學生',
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
      } catch {}
    }
  }, [])

  const userRole = (user?.role as Role) || 'student'
  
  // 過濾出當前角色可見的選單項目
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  const handleLogout = () => {
    localStorage.removeItem('token')
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
