export interface EnrollmentStageDisplay {
  stage: string
  label: string
  count: number
  percentage: number
}

const LEAD_STATUS_ALIASES: Record<string, string> = {
  inquiry: 'new',
  trial: 'trial_scheduled',
  follow_up: 'contacted',
  scheduled: 'trial_scheduled',
}

export const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  new: { label: '新諮詢', badge: 'bg-gray-100 text-gray-600 border-gray-200' },
  contacted: { label: '跟進中', badge: 'bg-[#6B8CAE]/10 text-[#6B8CAE] border-[#6B8CAE]/20' },
  trial_scheduled: { label: '預約試聽', badge: 'bg-[#C4956A]/10 text-[#C4956A] border-[#C4956A]/20' },
  trial_completed: { label: '完成試聽', badge: 'bg-[#9B7FB6]/10 text-[#9B7FB6] border-[#9B7FB6]/20' },
  enrolled: { label: '已報名', badge: 'bg-[#7B9E89]/10 text-[#7B9E89] border-[#7B9E89]/20' },
  lost: { label: '未成交', badge: 'bg-[#B5706E]/10 text-[#B5706E] border-[#B5706E]/20' },
}

export const STATUS_OPTIONS = ['new', 'contacted', 'trial_scheduled', 'trial_completed', 'enrolled', 'lost'] as const

const FUNNEL_STAGE_MAP: Record<string, { stage: string; label: string }> = {
  inquiry: { stage: 'new', label: '新諮詢' },
  new: { stage: 'new', label: '新諮詢' },
  '新諮詢': { stage: 'new', label: '新諮詢' },
  follow_up: { stage: 'contacted', label: '跟進中' },
  contacted: { stage: 'contacted', label: '跟進中' },
  '已聯絡': { stage: 'contacted', label: '跟進中' },
  '跟進中': { stage: 'contacted', label: '跟進中' },
  trial: { stage: 'trial_scheduled', label: '預約試聽' },
  trial_scheduled: { stage: 'trial_scheduled', label: '預約試聽' },
  '試聽': { stage: 'trial_scheduled', label: '預約試聽' },
  '預約試聽': { stage: 'trial_scheduled', label: '預約試聽' },
  trial_completed: { stage: 'trial_completed', label: '完成試聽' },
  '完成試聽': { stage: 'trial_completed', label: '完成試聽' },
  enrolled: { stage: 'enrolled', label: '已報名' },
  '正式報名': { stage: 'enrolled', label: '已報名' },
  '已報名': { stage: 'enrolled', label: '已報名' },
}

export function normalizeLeadStatus(status: string): string {
  return LEAD_STATUS_ALIASES[status] ?? status
}

export function getLeadStatusLabel(status: string): string {
  const normalized = normalizeLeadStatus(status)
  return STATUS_CONFIG[normalized]?.label ?? status
}

export function normalizeFunnelStages(payload: unknown): EnrollmentStageDisplay[] {
  if (!Array.isArray(payload)) return []

  return payload.flatMap((item) => {
    if (!item || typeof item !== 'object') return []

    const raw = item as Record<string, unknown>
    const key = String(raw.stage ?? raw.label ?? '')
    const mapped = FUNNEL_STAGE_MAP[key]
    if (!mapped) return []

    return [{
      stage: mapped.stage,
      label: mapped.label,
      count: Number(raw.count ?? 0),
      percentage: Number(raw.percentage ?? 0),
    }]
  })
}