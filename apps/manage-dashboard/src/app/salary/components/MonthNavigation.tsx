'use client'

import { LABOR_TIERS, HEALTH_TIERS, calcLabor, calcHealth } from '../constants'

export interface MonthNavigationProps {
  monthLabel: string
  monthStart: string
  monthEnd: string
  laborTierIndex: number
  healthTierIndex: number
  onPrevMonth: () => void
  onNextMonth: () => void
  onLaborTierChange: (index: number) => void
  onHealthTierChange: (index: number) => void
}

export function MonthNavigation({
  monthLabel,
  monthStart,
  monthEnd,
  laborTierIndex,
  healthTierIndex,
  onPrevMonth,
  onNextMonth,
  onLaborTierChange,
  onHealthTierChange,
}: MonthNavigationProps) {
  const { personal: laborPersonal, employer: laborEmployer } = calcLabor(LABOR_TIERS[laborTierIndex].wage)
  const { personal: healthPersonal, employer: healthEmployer } = calcHealth(HEALTH_TIERS[healthTierIndex].wage)

  return (
    <>
      {/* Month Navigation */}
      <div className="flex items-center justify-between mt-3">
        <button onClick={onPrevMonth} className="p-2 text-text-muted hover:text-text">
          ← 上月
        </button>
        <div className="text-center">
          <p className="font-medium text-text">{monthLabel}</p>
          <p className="text-xs text-text-muted">{monthStart} ~ {monthEnd}</p>
        </div>
        <button onClick={onNextMonth} className="p-2 text-text-muted hover:text-text">
          下月 →
        </button>
      </div>

      {/* 勞健保級距選擇 */}
      <div className="mt-3 border border-border rounded-xl bg-background p-3 space-y-2">
        <p className="text-xs font-semibold text-text-muted">勞健保投保級距設定（2026年）</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-text-muted mb-1">勞保級距</label>
            <select
              value={laborTierIndex}
              onChange={e => onLaborTierChange(Number(e.target.value))}
              className="w-full text-xs px-2 py-1.5 border border-border rounded-lg bg-surface text-text"
            >
              {LABOR_TIERS.map((t, i) => (
                <option key={t.level} value={i}>{t.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1">
              個人 <span className="text-[#9DAEBB] font-medium">${laborPersonal.toLocaleString()}</span>
              ／雇主 <span className="text-[#C8A882] font-medium">${laborEmployer.toLocaleString()}</span>
            </p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">健保級距</label>
            <select
              value={healthTierIndex}
              onChange={e => onHealthTierChange(Number(e.target.value))}
              className="w-full text-xs px-2 py-1.5 border border-border rounded-lg bg-surface text-text"
            >
              {HEALTH_TIERS.map((t, i) => (
                <option key={t.level} value={i}>{t.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-text-muted mt-1">
              個人 <span className="text-[#9DAEBB] font-medium">${healthPersonal.toLocaleString()}</span>
              ／雇主 <span className="text-[#C8A882] font-medium">${healthEmployer.toLocaleString()}</span>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
