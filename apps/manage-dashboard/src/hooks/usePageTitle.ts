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
  '/teacher-home': '教師首頁',
  '/schedules': '我的課表',
  '/my-attendance': '我的出缺勤紀錄',
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
