'use client'

import { BackButton } from '@/components/ui/BackButton'

export default function MyGradesPage() {
  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <BackButton />
      
      <div>
        <h1 className="text-2xl font-bold text-text">我的成績</h1>
        <p className="text-text-muted mt-1">查看歷次考試成績</p>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-primary">85</p>
          <p className="text-sm text-text-muted mt-1">本學期平均</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-morandi-sage">90</p>
          <p className="text-sm text-text-muted mt-1">最高分</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-bold text-text">5</p>
          <p className="text-sm text-text-muted mt-1">考試次數</p>
        </div>
      </div>
      
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">科目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">考試</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">日期</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">分數</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3 text-sm">數學</td><td className="px-4 py-3 text-sm">小考2</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-07</td><td className="px-4 py-3 text-right font-medium text-primary">90</td></tr>
            <tr><td className="px-4 py-3 text-sm">數學</td><td className="px-4 py-3 text-sm">段考1</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-01</td><td className="px-4 py-3 text-right font-medium text-morandi-sage">85</td></tr>
            <tr><td className="px-4 py-3 text-sm">數學</td><td className="px-4 py-3 text-sm">小考1</td><td className="px-4 py-3 text-sm text-text-muted">2026-01-15</td><td className="px-4 py-3 text-right font-medium text-morandi-sage">82</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
