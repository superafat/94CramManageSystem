'use client'

interface FunnelStage {
  stage: string
  label: string
  count: number
  percentage: number
}

interface FunnelChartProps {
  stages: FunnelStage[]
  loading?: boolean
}

const STAGE_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  new: { bar: 'bg-[#6B8CAE]', bg: 'bg-[#6B8CAE]/10', text: 'text-[#6B8CAE]' },
  contacted: { bar: 'bg-[#7BA7BC]', bg: 'bg-[#7BA7BC]/10', text: 'text-[#7BA7BC]' },
  trial_scheduled: { bar: 'bg-[#C4956A]', bg: 'bg-[#C4956A]/10', text: 'text-[#C4956A]' },
  trial_completed: { bar: 'bg-[#9B7FB6]', bg: 'bg-[#9B7FB6]/10', text: 'text-[#9B7FB6]' },
  enrolled: { bar: 'bg-[#7B9E89]', bg: 'bg-[#7B9E89]/10', text: 'text-[#7B9E89]' },
}

const STAGE_HINTS: Record<string, string> = {
  new: '初次來電或網路諮詢的家長',
  contacted: '已回電或回訊聯繫過',
  trial_scheduled: '已預約免費試聽課',
  trial_completed: '已實際到班試聽',
  enrolled: '確認繳費正式報名',
}

const DEFAULT_STAGES: FunnelStage[] = [
  { stage: 'new', label: '新諮詢', count: 0, percentage: 100 },
  { stage: 'contacted', label: '已聯絡', count: 0, percentage: 0 },
  { stage: 'trial_scheduled', label: '預約試聽', count: 0, percentage: 0 },
  { stage: 'trial_completed', label: '完成試聽', count: 0, percentage: 0 },
  { stage: 'enrolled', label: '正式報名', count: 0, percentage: 0 },
]

export function FunnelChart({ stages, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-4 md:p-6">
        <div className="h-6 w-32 bg-surface-hover animate-pulse rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-surface-hover animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  const displayStages = stages.length > 0 ? stages : DEFAULT_STAGES
  const maxCount = Math.max(...displayStages.map((s) => s.count), 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-4 md:p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-base md:text-lg font-semibold text-text">招生漏斗</h3>
        <span className="text-xs text-text-muted bg-surface-hover px-2 py-0.5 rounded-full">
          從諮詢到報名的轉換流程
        </span>
      </div>
      <p className="text-xs text-text-muted mb-4">每一階段顯示人數與佔首階段的百分比，越往下代表越接近正式報名</p>
      <div className="space-y-3">
        {displayStages.map((stage, idx) => {
          const colors = STAGE_COLORS[stage.stage] ?? STAGE_COLORS['new']
          const barWidth = maxCount > 0 ? Math.round((stage.count / maxCount) * 100) : 0
          // Funnel visual: decrease width per stage
          const funnelWidth = 100 - idx * 8
          const hint = STAGE_HINTS[stage.stage]
          return (
            <div key={stage.stage}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text font-medium">
                  {stage.label}
                  {hint && <span className="ml-1.5 text-[10px] text-text-muted font-normal">({hint})</span>}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${colors.text}`}>{stage.count}</span>
                  <span className="text-xs text-text-muted">{stage.percentage}%</span>
                </div>
              </div>
              <div
                className="h-9 rounded-xl overflow-hidden bg-surface flex items-center px-3"
                style={{ width: `${funnelWidth}%`, minWidth: '60%' }}
              >
                <div
                  className={`h-5 rounded-lg transition-all ${colors.bar}`}
                  style={{ width: `${barWidth}%`, minWidth: stage.count > 0 ? '2%' : '0%' }}
                />
              </div>
            </div>
          )
        })}
      </div>
      {displayStages.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>首階段 → 末階段轉換率</span>
          <span className="font-medium text-[#7B9E89]">
            {displayStages[0].count > 0
              ? `${Math.round((displayStages[displayStages.length - 1].count / displayStages[0].count) * 100)}%`
              : '—'}
          </span>
        </div>
      )}
    </div>
  )
}
