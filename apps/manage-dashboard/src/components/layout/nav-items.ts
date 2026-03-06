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
