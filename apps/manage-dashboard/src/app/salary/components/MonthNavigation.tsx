'use client'

export interface MonthNavigationProps {
  monthLabel: string
  monthStart: string
  monthEnd: string
  onPrevMonth: () => void
  onNextMonth: () => void
}

export function MonthNavigation({
  monthLabel,
  monthStart,
  monthEnd,
  onPrevMonth,
  onNextMonth,
}: MonthNavigationProps) {
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

      {/* 勞健保提示 */}
      <div className="mt-3 border border-border rounded-xl bg-background p-3 space-y-2">
        <p className="text-xs font-semibold text-text-muted">勞健保級距方案</p>
        <p className="text-xs text-text-muted leading-5">
          每位老師各自維護勞保與健保級距，預設使用自動計算；若遇到特殊投保或代扣情境，可在講師管理中切換為手動金額。
        </p>
        <p className="text-[10px] text-text-muted leading-5">
          兼職按堂薪的二代健保補充保費，應依是否在本單位投保、每週工時是否達應投保門檻，以及單次給付是否達基本工資判斷，不是所有兼職講師都固定扣收。
        </p>
      </div>
    </>
  )
}
