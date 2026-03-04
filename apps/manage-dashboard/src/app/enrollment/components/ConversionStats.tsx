'use client'

interface ConversionStatsProps {
  totalLeads: number
  conversionRate: number
  trialsScheduled: number
  enrolledCount: number
  loading?: boolean
}

export function ConversionStats({
  totalLeads,
  conversionRate,
  trialsScheduled,
  enrolledCount,
  loading,
}: ConversionStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-surface-hover animate-pulse rounded-2xl" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: '新諮詢數',
      value: totalLeads,
      unit: '人',
      color: 'text-[#6B8CAE]',
      bg: 'bg-[#6B8CAE]/10',
      icon: '📋',
    },
    {
      label: '轉換率',
      value: `${conversionRate}`,
      unit: '%',
      color: 'text-[#7B9E89]',
      bg: 'bg-[#7B9E89]/10',
      icon: '📈',
    },
    {
      label: '預約試聽',
      value: trialsScheduled,
      unit: '人',
      color: 'text-[#C4956A]',
      bg: 'bg-[#C4956A]/10',
      icon: '🎯',
    },
    {
      label: '已報名',
      value: enrolledCount,
      unit: '人',
      color: 'text-[#9B7FB6]',
      bg: 'bg-[#9B7FB6]/10',
      icon: '✅',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-border p-4">
          <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${card.bg} mb-2 text-base`}>
            {card.icon}
          </div>
          <div className={`text-2xl md:text-3xl font-bold ${card.color}`}>
            {card.value}
            <span className="text-sm font-normal ml-0.5">{card.unit}</span>
          </div>
          <div className="text-xs md:text-sm text-text-muted mt-0.5">{card.label}</div>
        </div>
      ))}
    </div>
  )
}
