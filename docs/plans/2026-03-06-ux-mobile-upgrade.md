# UX Mobile Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 全面升級 94Manage Dashboard 的行動端體驗，導入漢堡選單、卡片佈局、BottomSheet Modal、Dashboard 快速行動，並統一視覺 token。

**Architecture:** 採用 Foundation-first 策略——先建立共用元件層（MobileDrawer、BottomSheet、共用 navItems、hooks），再逐頁套用。桌面端（≥ lg）完全不動，所有行動端改動限定在 `< lg` breakpoint。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS (莫蘭迪色系), React hooks

**Design doc:** `docs/plans/2026-03-06-ux-mobile-upgrade-design.md`

---

## Task 1: 提取共用導覽常數 nav-items.ts

**Files:**
- Create: `apps/manage-dashboard/src/components/layout/nav-items.ts`
- Modify: `apps/manage-dashboard/src/components/layout/Sidebar.tsx`

**Step 1: 建立 nav-items.ts**

```typescript
// apps/manage-dashboard/src/components/layout/nav-items.ts

export type Role = 'superadmin' | 'admin' | 'staff' | 'teacher'

export interface NavItem {
  href?: string
  icon?: string
  label?: string
  type?: 'separator'
  separator?: string
  roles: Role[]
}

export const navItems: NavItem[] = [
  { href: '/dashboard', icon: '📊', label: '總覽', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/headquarters', icon: '🏢', label: '總部管理', roles: ['superadmin'] },
  { href: '/dashboard/audit', icon: '📋', label: '異動日誌', roles: ['superadmin', 'admin'] },
  { href: '/dashboard/settings', icon: '⚙️', label: '系統設定', roles: ['superadmin'] },

  { type: 'separator', separator: '班務管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/students', icon: '👥', label: '學生管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/finance', icon: '💰', label: '帳務管理', roles: ['superadmin', 'admin', 'staff'] },
  { href: '/reports', icon: '📈', label: '報表中心', roles: ['superadmin', 'admin'] },
  { href: '/enrollment', icon: '🎪', label: '招生管理', roles: ['superadmin', 'admin'] },

  { type: 'separator', separator: '講師管理', roles: ['superadmin', 'admin'] },
  { href: '/teachers', icon: '👨‍🏫', label: '講師名單', roles: ['superadmin', 'admin'] },
  { href: '/scheduling-center', icon: '📅', label: '排課中心', roles: ['superadmin', 'admin'] },
  { href: '/teacher-attendance', icon: '🕐', label: '師資出缺勤', roles: ['superadmin', 'admin'] },
  { href: '/my-salary', icon: '💵', label: '我的薪資條', roles: ['staff', 'teacher'] },
]

export const roleLabels: Record<Role, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '教師',
}
```

**Step 2: 更新 Sidebar.tsx 改用 nav-items.ts**

在 `Sidebar.tsx` 頂部刪除 `type Role`、`NavItem` interface、`navItems` array、`roleLabels` 常數，改為：

```typescript
import { navItems, roleLabels, type Role, type NavItem } from './nav-items'
```

**Step 3: 驗證型別**

```bash
cd /Users/dali/Github/94CramManageSystem
pnpm --filter manage-dashboard typecheck
```

預期：0 errors

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/components/layout/nav-items.ts
git add apps/manage-dashboard/src/components/layout/Sidebar.tsx
git commit -m "refactor(manage): extract nav-items.ts shared constants"
```

---

## Task 2: 新增 usePageTitle hook

**Files:**
- Create: `apps/manage-dashboard/src/hooks/usePageTitle.ts`

**Step 1: 建立 usePageTitle.ts**

```typescript
// apps/manage-dashboard/src/hooks/usePageTitle.ts
'use client'

import { usePathname } from 'next/navigation'

const exactTitles: Record<string, string> = {
  '/dashboard': '行政總覽',
  '/dashboard/settings': '系統設定',
  '/dashboard/audit': '異動日誌',
  '/dashboard/analytics': '數據分析',
  '/dashboard/trials': '試用管理',
  '/dashboard/knowledge': '知識庫',
  '/dashboard/conversations': '對話紀錄',
  '/students': '學生管理',
  '/finance': '帳務管理',
  '/reports': '報表中心',
  '/enrollment': '招生管理',
  '/teachers': '講師名單',
  '/scheduling-center': '排課中心',
  '/teacher-attendance': '師資出缺勤',
  '/salary': '薪資管理',
  '/my-salary': '我的薪資條',
  '/headquarters': '總部管理',
  '/billing': '帳務管理',
}

const prefixTitles: Array<[string, string]> = [
  ['/students/', '學生詳情'],
  ['/scheduling-center/', '排課中心'],
]

export function usePageTitle(): string {
  const pathname = usePathname() || ''
  if (exactTitles[pathname]) return exactTitles[pathname]
  for (const [prefix, title] of prefixTitles) {
    if (pathname.startsWith(prefix)) return title
  }
  return '94Manage'
}
```

**Step 2: 加入 hooks/index.ts**

在 `apps/manage-dashboard/src/hooks/index.ts` 中加入：
```typescript
export { usePageTitle } from './usePageTitle'
```

**Step 3: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

預期：0 errors

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/hooks/usePageTitle.ts
git add apps/manage-dashboard/src/hooks/index.ts
git commit -m "feat(manage): add usePageTitle hook for mobile header"
```

---

## Task 3: 新增 useIsMobile hook

**Files:**
- Create: `apps/manage-dashboard/src/hooks/useIsMobile.ts`

**Step 1: 建立 useIsMobile.ts**

```typescript
// apps/manage-dashboard/src/hooks/useIsMobile.ts
'use client'

import { useEffect, useState } from 'react'

export function useIsMobile(breakpoint = 1024): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])

  return isMobile
}
```

**Step 2: 加入 hooks/index.ts**

```typescript
export { useIsMobile } from './useIsMobile'
```

**Step 3: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/hooks/useIsMobile.ts
git add apps/manage-dashboard/src/hooks/index.ts
git commit -m "feat(manage): add useIsMobile hook"
```

---

## Task 4: 新增 BottomSheet 共用元件

**Files:**
- Create: `apps/manage-dashboard/src/components/ui/BottomSheet.tsx`

**Step 1: 建立 BottomSheet.tsx**

```tsx
// apps/manage-dashboard/src/components/ui/BottomSheet.tsx
'use client'

import { useEffect } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-xl max-h-[92vh] flex flex-col animate-slide-up">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text text-xl leading-none w-8 h-8 flex items-center justify-center"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
```

**Step 2: 加入 globals.css 補充 animate-slide-up**

在 `apps/manage-dashboard/src/app/globals.css` 的 `@theme` 後加入：

```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.animate-slide-up {
  animation: slide-up 0.28s ease-out;
}
```

（若已有 `animate-slide-up` 定義則跳過此步）

**Step 3: 加入 ui/index.ts**

在 `apps/manage-dashboard/src/components/ui/index.ts` 加入：
```typescript
export { BottomSheet } from './BottomSheet'
```

**Step 4: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/components/ui/BottomSheet.tsx
git add apps/manage-dashboard/src/components/ui/index.ts
git add apps/manage-dashboard/src/app/globals.css
git commit -m "feat(manage): add BottomSheet mobile component"
```

---

## Task 5: 新增 MobileDrawer 元件

**Files:**
- Create: `apps/manage-dashboard/src/components/layout/MobileDrawer.tsx`

**Step 1: 建立 MobileDrawer.tsx**

```tsx
// apps/manage-dashboard/src/components/layout/MobileDrawer.tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { navItems, roleLabels, type Role } from './nav-items'

interface User {
  id: string
  name: string
  role: Role
  tenant_id: string
}

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch { localStorage.removeItem('user') }
    }
  }, [])

  // 路由切換後自動關閉
  useEffect(() => { onClose() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const userRole = (user?.role as Role) || 'staff'
  const visibleItems = navItems.filter(item => item.roles.includes(userRole))

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('branchId')
    router.push('/login')
  }

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 max-w-[80vw] bg-surface border-r border-border z-50 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* User card */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
              🐝
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text text-sm truncate">{user?.name || '載入中...'}</p>
              <p className="text-xs text-text-muted">{roleLabels[userRole] || userRole}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text p-1"
              aria-label="關閉選單"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item, index) => {
            if (item.type === 'separator') {
              return (
                <div key={`sep-${index}`} className="py-2">
                  <div className="border-t border-border" />
                  <div className="text-xs text-text-muted px-3 pt-3 pb-1 font-medium">
                    {item.separator}
                  </div>
                </div>
              )
            }

            const href = item.href!
            const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href))

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all min-h-[44px] ${
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
        <div className="p-4 border-t border-border space-y-1">
          <div className="px-4 py-2 bg-primary/5 rounded-xl mb-2">
            <p className="text-xs text-text-muted">
              目前身份：<span className="font-medium text-primary">{roleLabels[userRole]}</span>
            </p>
          </div>
          <a
            href="https://94cram.com"
            className="flex items-center gap-3 px-4 py-3 text-text-muted hover:text-text rounded-xl hover:bg-surface-hover text-sm min-h-[44px]"
          >
            <span>🏠</span>
            <span>返回首頁</span>
          </a>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-text-muted hover:text-text rounded-xl hover:bg-surface-hover text-sm min-h-[44px]"
          >
            <span>🚪</span>
            <span>切換帳號</span>
          </button>
        </div>
      </aside>
    </>
  )
}
```

**Step 2: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 3: Commit**

```bash
git add apps/manage-dashboard/src/components/layout/MobileDrawer.tsx
git commit -m "feat(manage): add MobileDrawer hamburger navigation"
```

---

## Task 6: 更新 MobileHeader（加漢堡按鈕 + usePageTitle）

**Files:**
- Modify: `apps/manage-dashboard/src/components/layout/MobileHeader.tsx`

**Step 1: 重寫 MobileHeader.tsx**

完整替換為：

```tsx
// apps/manage-dashboard/src/components/layout/MobileHeader.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePageTitle } from '@/hooks/usePageTitle'

const roleLabels: Record<string, string> = {
  superadmin: '系統管理員',
  admin: '館長',
  staff: '行政',
  teacher: '老師',
}

interface User {
  name: string
  role: string
}

interface MobileHeaderProps {
  onMenuClick: () => void
}

export function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  const router = useRouter()
  const title = usePageTitle()
  const [user, setUser] = useState<User | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setUser(JSON.parse(userStr)) } catch { localStorage.removeItem('user') }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }) } catch { /* ignore */ }
    localStorage.removeItem('user')
    localStorage.removeItem('tenantId')
    localStorage.removeItem('branchId')
    router.push('/login')
  }

  return (
    <header className="sticky top-0 bg-white border-b border-border z-20 safe-area-top">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          {/* 漢堡按鈕 */}
          <button
            type="button"
            onClick={onMenuClick}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-text-muted hover:bg-surface hover:text-text transition-colors"
            aria-label="開啟選單"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="font-semibold text-text text-base">{title}</h1>
        </div>

        {user && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
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
                <a
                  href="https://94cram.com"
                  className="w-full px-4 py-3 text-left text-sm text-text hover:bg-surface flex items-center gap-2"
                >
                  <span>🏠</span>
                  返回首頁
                </a>
                <button
                  type="button"
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
```

**Step 2: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 3: Commit**

```bash
git add apps/manage-dashboard/src/components/layout/MobileHeader.tsx
git commit -m "feat(manage): update MobileHeader with hamburger button and usePageTitle"
```

---

## Task 7: 更新 AppLayout（整合 Drawer，移除 MobileNav）

**Files:**
- Modify: `apps/manage-dashboard/src/components/layout/AppLayout.tsx`

**Step 1: 重寫 AppLayout.tsx**

```tsx
// apps/manage-dashboard/src/components/layout/AppLayout.tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { MobileDrawer } from './MobileDrawer'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const PUBLIC_PATHS = ['/login', '/demo', '/trial-signup', '/landing', '/guide']

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return <>{children}</>
  }

  useEffect(() => {
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!user) {
      router.push('/login')
      return
    }
    setAuthorized(true)
  }, [pathname, router])

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* 桌面版：側邊欄 */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* 手機版：頂部 Header + 側邊 Drawer */}
        <div className="lg:hidden">
          <MobileHeader onMenuClick={() => setDrawerOpen(true)} />
          <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>

        {/* 主內容區 */}
        <main className="lg:ml-64 pb-6 lg:pb-0">
          <div className="p-4 lg:p-8">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
```

**Step 2: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 3: 確認 MobileNav 不再被任何地方 import**

```bash
grep -r "MobileNav" apps/manage-dashboard/src --include="*.tsx" --include="*.ts"
```

預期：只剩 `MobileNav.tsx` 本身的定義，無其他 import。

**Step 4: 刪除 MobileNav.tsx**

```bash
rm apps/manage-dashboard/src/components/layout/MobileNav.tsx
```

**Step 5: 再次驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 6: Commit**

```bash
git add apps/manage-dashboard/src/components/layout/AppLayout.tsx
git rm apps/manage-dashboard/src/components/layout/MobileNav.tsx
git commit -m "feat(manage): replace bottom tab nav with MobileDrawer hamburger menu"
```

---

## Task 8: 學生管理頁面行動化（卡片佈局）

**Files:**
- Modify: `apps/manage-dashboard/src/app/students/page.tsx`

**Step 1: 讀取並理解現有 students/page.tsx 的表格渲染區段**

先 Read 整個檔案，找到表格的 JSX 區段（通常在 `return` 後的 `<table>` 部分）。

**Step 2: 在表格的前面加入行動端卡片清單**

找到現有表格的外層容器（通常是 `<div className="overflow-x-auto">` 或類似），在其前面插入手機版卡片：

```tsx
{/* 手機版：卡片清單 */}
<div className="sm:hidden space-y-3">
  {students.map(student => (
    <div
      key={student.id}
      className="bg-white rounded-xl border border-border p-4 shadow-sm"
      style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text">{student.full_name}</span>
            {(student.grade_override || student.computed_grade || student.grade_level) && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#9DAEBB]/20 text-[#5A7A8F]">
                {student.grade_override || student.computed_grade || student.grade_level}
              </span>
            )}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
              student.status === 'active'
                ? 'bg-[#A8B5A2]/20 text-[#4A6B44]'
                : 'bg-border/40 text-text-muted'
            }`}>
              {student.status === 'active' ? '在籍' : student.status}
            </span>
          </div>
          {student.phone && (
            <p className="text-xs text-text-muted mt-1">{student.phone}</p>
          )}
          {student.enrollments && student.enrollments.length > 0 && (
            <p className="text-xs text-text-muted mt-0.5">
              報名：{student.enrollments.map(e => e.course_name).filter(Boolean).join('、')}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { setEditingStudent(student); setForm({ fullName: student.full_name, gradeLevel: student.grade_level || '', phone: student.phone || '', email: student.email || '', schoolName: student.school_name || '', notes: student.notes || '', dateOfBirth: student.date_of_birth || '', gradeOverride: student.grade_override || '' }); setShowModal(true) }}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-muted hover:bg-surface hover:text-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  ))}
  {students.length === 0 && (
    <p className="text-center text-text-muted text-sm py-8">沒有符合條件的學生</p>
  )}
</div>
```

**Step 3: 為現有表格加上 `hidden sm:block` class**

找到表格外層容器（`overflow-x-auto` 或 `overflow-hidden` 的 div），加上 `hidden sm:block` class：

```tsx
{/* 桌面版：表格 */}
<div className="hidden sm:block overflow-x-auto">
  <table>...</table>
</div>
```

**Step 4: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/students/page.tsx
git commit -m "feat(manage): add mobile card layout to students page"
```

---

## Task 9: 教師管理頁面行動化

**Files:**
- Modify: `apps/manage-dashboard/src/app/teachers/page.tsx`

**Step 1: 讀取 teachers/page.tsx 確認現有表格結構**

**Step 2: 加入行動端卡片佈局**

套用與 Task 8 相同 pattern，在表格前加 `sm:hidden` 卡片：

```tsx
{/* 手機版：卡片清單 */}
<div className="sm:hidden space-y-3">
  {teachers.map(teacher => (
    <div
      key={teacher.id}
      className="bg-white rounded-xl border border-border p-4"
      style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.08)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text">{teacher.name}</span>
            {teacher.subjects && teacher.subjects.length > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#C8A882]/20 text-[#8F6A3A]">
                {Array.isArray(teacher.subjects) ? teacher.subjects.join('、') : teacher.subjects}
              </span>
            )}
          </div>
          {teacher.phone && (
            <a href={`tel:${teacher.phone}`} className="text-xs text-text-muted mt-1 block">{teacher.phone}</a>
          )}
          {teacher.email && (
            <p className="text-xs text-text-muted">{teacher.email}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => { /* open edit modal for this teacher */ }}
          className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-border text-text-muted hover:bg-surface hover:text-text transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
    </div>
  ))}
</div>
```

注意：需根據 teachers/page.tsx 的實際 state 名稱調整（teacher 物件的欄位名稱）。

**Step 3: 為現有表格加 `hidden sm:block`**

**Step 4: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/teachers/page.tsx
git commit -m "feat(manage): add mobile card layout to teachers page"
```

---

## Task 10: 師資出缺勤頁面行動化

**Files:**
- Modify: `apps/manage-dashboard/src/app/teacher-attendance/page.tsx`

**Step 1: 讀取 teacher-attendance/page.tsx 確認現有表格結構**

**Step 2: 套用相同的 `sm:hidden` 卡片 + `hidden sm:block` 表格 pattern**

出缺勤卡片欄位：
- 教師姓名
- 日期 + 出勤狀態 badge（出席/請假/缺席）
- 備註（如有）

**Step 3: 驗證型別 + Commit**

```bash
pnpm --filter manage-dashboard typecheck
git add apps/manage-dashboard/src/app/teacher-attendance/page.tsx
git commit -m "feat(manage): add mobile card layout to teacher-attendance page"
```

---

## Task 11: 排課彈窗行動化（CreateScheduleModal + BottomSheet）

**Files:**
- Modify: `apps/manage-dashboard/src/app/scheduling-center/components/CreateScheduleModal.tsx`

**Step 1: 讀取 CreateScheduleModal.tsx 確認現有結構**

**Step 2: 加入 useIsMobile 和步驟狀態**

在 component 頂部加入：

```tsx
import { useIsMobile } from '@/hooks/useIsMobile'
import { BottomSheet } from '@/components/ui/BottomSheet'

// 在 component 內：
const isMobile = useIsMobile()
const [step, setStep] = useState<1 | 2>(1)
```

**Step 3: 重構 return 為條件渲染**

```tsx
if (!isOpen) return null

// 共用表單內容抽成兩個 section
const formSection = (
  <div className="space-y-4 p-5">
    {/* 現有的課程、日期、時間、教室、老師欄位 */}
    {/* 衝突警告 */}
    {!isMobile && courseId && selectedCourse && (
      <StudentPickerSection /> // 桌面版在同一頁顯示
    )}
  </div>
)

const studentSection = (
  <div className="p-5">
    <StudentPicker ... />
  </div>
)

if (isMobile) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="新增排課">
      {/* 步驟進度條 */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-border'}`} />
          <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-border'}`} />
        </div>
        <p className="text-xs text-text-muted mt-1">步驟 {step}/2</p>
      </div>

      {step === 1 ? formSection : studentSection}

      {/* 底部按鈕 */}
      <div className="sticky bottom-0 bg-white border-t border-border px-5 py-4 flex gap-3">
        {step === 2 && (
          <button type="button" onClick={() => setStep(1)}
            className="flex-1 px-4 py-3 text-sm font-medium rounded-xl border border-border text-text">
            上一步
          </button>
        )}
        {step === 1 ? (
          <button type="button"
            onClick={() => setStep(2)}
            disabled={!courseId}
            className="flex-1 px-4 py-3 text-sm font-medium rounded-xl bg-primary text-white disabled:opacity-50">
            下一步：選擇學生
          </button>
        ) : (
          <button type="button" onClick={handleSave} disabled={saving || !courseId || !scheduledDate || !startTime || !endTime}
            className="flex-1 px-4 py-3 text-sm font-medium rounded-xl bg-primary text-white disabled:opacity-50">
            {saving ? '建立中...' : '建立排課'}
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

// 桌面版：維持現有 Modal（不改動）
return (
  <>
    {/* 現有 Modal JSX 完全不動 */}
  </>
)
```

**Step 4: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/scheduling-center/components/CreateScheduleModal.tsx
git commit -m "feat(manage): add BottomSheet + step flow to CreateScheduleModal on mobile"
```

---

## Task 12: 排課彈窗行動化（EditScheduleModal + BottomSheet）

**Files:**
- Modify: `apps/manage-dashboard/src/app/scheduling-center/components/EditScheduleModal.tsx`

**Step 1: 套用與 Task 11 相同的 pattern**

加入 `useIsMobile`、`BottomSheet`、`step` state，重構 return：
- Step 1：基本資訊（日期、時間、教室、老師、備註）
- Step 2：學生名單

**Step 2: 驗證型別 + Commit**

```bash
pnpm --filter manage-dashboard typecheck
git add apps/manage-dashboard/src/app/scheduling-center/components/EditScheduleModal.tsx
git commit -m "feat(manage): add BottomSheet + step flow to EditScheduleModal on mobile"
```

---

## Task 13: Dashboard 快速行動區塊

**Files:**
- Modify: `apps/manage-dashboard/src/app/dashboard/page.tsx`

**Step 1: 讀取 dashboard/page.tsx 確認現有 StatCard 區段**

**Step 2: 在 StatCard 群組後加入 Quick Actions**

```tsx
{/* Quick Actions（手機優先，桌面也顯示） */}
{authorized && (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
    {/* admin/staff 快捷 */}
    {['admin', 'staff', 'superadmin'].includes(userRole) && (
      <>
        <a
          href="/scheduling-center"
          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all group"
          style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.06)' }}
        >
          <span className="text-xl">📅</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">今日課表</p>
            <p className="text-xs text-text-muted">排課中心</p>
          </div>
        </a>
        <a
          href="/finance"
          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
          style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.06)' }}
        >
          <span className="text-xl">💰</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">帳務管理</p>
            <p className="text-xs text-text-muted">收費追蹤</p>
          </div>
        </a>
        <a
          href="/students"
          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
          style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.06)' }}
        >
          <span className="text-xl">👥</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">學生管理</p>
            <p className="text-xs text-text-muted">在籍 {stats?.activeStudents || 0} 人</p>
          </div>
        </a>
      </>
    )}
    {/* teacher 快捷 */}
    {userRole === 'teacher' && (
      <>
        <a
          href="/scheduling-center"
          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
          style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.06)' }}
        >
          <span className="text-xl">📅</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">今日課表</p>
          </div>
        </a>
        <a
          href="/my-salary"
          className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
          style={{ boxShadow: '0 1px 3px rgba(90,85,80,0.06)' }}
        >
          <span className="text-xl">💵</span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text truncate">我的薪資條</p>
          </div>
        </a>
      </>
    )}
  </div>
)}
```

注意：`userRole` 需從現有的 user state 中取得，調整取值邏輯配合現有 component 的 state 名稱。

**Step 3: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 4: Commit**

```bash
git add apps/manage-dashboard/src/app/dashboard/page.tsx
git commit -m "feat(manage): add quick actions widget to dashboard"
```

---

## Task 14: 視覺一致性 Token 補充

**Files:**
- Modify: `apps/manage-dashboard/src/app/globals.css`

**Step 1: 讀取 globals.css 確認現有 token**

**Step 2: 補充 token（只加，不改現有）**

在 `@theme` 區塊加入：

```css
/* 觸控最小尺寸 */
--touch-target: 44px;

/* 卡片陰影 */
--shadow-card: 0 1px 3px rgba(90, 85, 80, 0.08), 0 1px 2px rgba(90, 85, 80, 0.04);
```

**Step 3: 確認 animate-slide-up 已加（Task 4 應已加入）**

若還未加，補入：

```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.28s ease-out;
}
```

**Step 4: 驗證型別**

```bash
pnpm --filter manage-dashboard typecheck
```

**Step 5: Commit**

```bash
git add apps/manage-dashboard/src/app/globals.css
git commit -m "style(manage): add touch-target and card-shadow CSS tokens"
```

---

## Task 15: 最終驗證

**Step 1: 全域型別檢查**

```bash
pnpm --filter manage-dashboard typecheck
```

預期：0 errors

**Step 2: 確認刪除清單**

```bash
ls apps/manage-dashboard/src/components/layout/
```

預期：不存在 `MobileNav.tsx`，存在 `MobileDrawer.tsx`、`nav-items.ts`

**Step 3: 確認 hooks 新增**

```bash
ls apps/manage-dashboard/src/hooks/
```

預期：存在 `usePageTitle.ts`、`useIsMobile.ts`

**Step 4: 確認 UI 元件新增**

```bash
ls apps/manage-dashboard/src/components/ui/ | grep Bottom
```

預期：存在 `BottomSheet.tsx`

**Step 5: 最終 Commit（若有未 commit 的變動）**

```bash
git status
git add -A
git commit -m "chore(manage): final cleanup for mobile UX upgrade"
```

---

## 執行順序總覽

| Task | 說明 | 依賴 |
|------|------|------|
| 1 | nav-items.ts | 無 |
| 2 | usePageTitle | 無 |
| 3 | useIsMobile | 無 |
| 4 | BottomSheet | 無 |
| 5 | MobileDrawer | Task 1 |
| 6 | MobileHeader 改造 | Task 2 |
| 7 | AppLayout 改造 | Task 5, 6 |
| 8 | Students 卡片 | 無 |
| 9 | Teachers 卡片 | 無 |
| 10 | TeacherAttendance 卡片 | 無 |
| 11 | CreateScheduleModal BottomSheet | Task 3, 4 |
| 12 | EditScheduleModal BottomSheet | Task 3, 4 |
| 13 | Dashboard Quick Actions | 無 |
| 14 | Visual tokens | 無 |
| 15 | 最終驗證 | 全部 |

Tasks 1-4、8-10、13-14 均可並行執行。Tasks 5-7 需依序。Tasks 11-12 需 Task 3, 4 完成後。
