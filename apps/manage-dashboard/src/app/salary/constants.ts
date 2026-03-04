import type { InsuranceTier } from './types'

// ───────────── 勞健保級距常數 (2026年) ─────────────

// 勞保 2026 年級距（費率 12%，個人 20%，雇主 70%，政府 10%）
export const LABOR_TIERS: InsuranceTier[] = [
  { level: 1,  wage: 27470, label: '第1級 27,470元' },
  { level: 2,  wage: 28800, label: '第2級 28,800元' },
  { level: 3,  wage: 30300, label: '第3級 30,300元' },
  { level: 4,  wage: 31800, label: '第4級 31,800元' },
  { level: 5,  wage: 33300, label: '第5級 33,300元' },
  { level: 6,  wage: 34800, label: '第6級 34,800元' },
  { level: 7,  wage: 36300, label: '第7級 36,300元' },
  { level: 8,  wage: 38200, label: '第8級 38,200元' },
  { level: 9,  wage: 40100, label: '第9級 40,100元' },
  { level: 10, wage: 42000, label: '第10級 42,000元' },
  { level: 11, wage: 44000, label: '第11級 44,000元' },
  { level: 12, wage: 45800, label: '第12級 45,800元' },
]

// 健保 2026 年級距（費率 5.17%，個人 30%，雇主 60%，政府 10%）
export const HEALTH_TIERS: InsuranceTier[] = [
  { level: 1,  wage: 27470, label: '第1級 27,470元' },
  { level: 2,  wage: 28800, label: '第2級 28,800元' },
  { level: 3,  wage: 30300, label: '第3級 30,300元' },
  { level: 4,  wage: 31800, label: '第4級 31,800元' },
  { level: 5,  wage: 33300, label: '第5級 33,300元' },
  { level: 6,  wage: 34800, label: '第6級 34,800元' },
  { level: 7,  wage: 36300, label: '第7級 36,300元' },
  { level: 8,  wage: 38200, label: '第8級 38,200元' },
  { level: 9,  wage: 40100, label: '第9級 40,100元' },
  { level: 10, wage: 42000, label: '第10級 42,000元' },
  { level: 11, wage: 44000, label: '第11級 44,000元' },
  { level: 12, wage: 45800, label: '第12級 45,800元' },
]

// 勞保計算（費率 12%，個人負擔 20%，雇主負擔 70%）
export const calcLabor = (wage: number) => ({
  personal: Math.round(wage * 0.12 * 0.20),
  employer: Math.round(wage * 0.12 * 0.70),
})

// 健保計算（費率 5.17%，個人負擔 30%，雇主負擔 60%）
export const calcHealth = (wage: number) => ({
  personal: Math.round(wage * 0.0517 * 0.30),
  employer: Math.round(wage * 0.0517 * 0.60),
})

// ───────────── Constants ─────────────

export const API_BASE = ''

export const SALARY_TYPE_LABELS: Record<string, string> = {
  monthly: '月薪制',
  hourly: '時薪制',
  per_class: '堂薪制',
}

export const LATE_DEDUCTION_PER_OCCURRENCE = 200  // 每次遲到扣 200 元
