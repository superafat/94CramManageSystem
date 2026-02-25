'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// 頁面標題對照
const pageTitles: Record<string, string> = {
  '/dashboard': '首頁',
  '/dashboard/knowledge': '知識庫',
  '/dashboard/conversations': '對話紀錄',
  '/dashboard/settings': '系統設定',
  '/students': '學生管理',
  '/schedules': '課表管理',
  '/attendance': '出席管理',
  '/grades': '成績管理',
  '/billing': '帳務管理',
  '/reports': '報表中心',
  '/my-children': '我的孩子',
  '/my-children/grades': '孩子成績',
  '/my-children/billing': '繳費查詢',
  '/my-schedule': '我的課表',
  '/my-grades': '我的成績',
  '/teachers': '講師管理',
  '/salary': '薪資管理',
  '/dashboard/trials': '試用管理',
  '/dashboard/audit': '操作紀錄',
}

// 角色顯示名稱
const roleLabels: Record<string, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '老師',
  parent: '家長',
  student: '學生',
}

interface User {
  name: string
  role: string
}

export function MobileHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch { localStorage.removeItem('user') }
    }
  }, [])

  // 點擊外部關閉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('branchId')
    router.push('/login')
  }

  const title = pageTitles[pathname || ''] || '蜂神榜'

  return (
    <header className="sticky top-0 bg-white border-b border-border z-20 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐝</span>
          <h1 className="font-semibold text-text">{title}</h1>
        </div>
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface active:bg-surface transition-colors"
            >
              <span className="text-sm font-medium text-text">{user.name}</span>
              <svg className={`w-4 h-4 text-text-muted transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-border overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="font-medium text-text">{user.name}</p>
                  <p className="text-xs text-text-muted">{roleLabels[user.role] || user.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-[#B5706E] hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  登出
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
