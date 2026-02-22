'use client'

export default function MyChildrenGradesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">成績查詢</h1>
        <p className="text-text-muted mt-1">查看孩子的考試成績</p>
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
            <tr><td className="px-4 py-3 text-sm">數學</td><td className="px-4 py-3 text-sm">段考1</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-01</td><td className="px-4 py-3 text-right font-medium text-morandi-sage">85</td></tr>
            <tr><td className="px-4 py-3 text-sm">數學</td><td className="px-4 py-3 text-sm">小考2</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-07</td><td className="px-4 py-3 text-right font-medium text-primary">90</td></tr>
            <tr><td className="px-4 py-3 text-sm">英文</td><td className="px-4 py-3 text-sm">段考1</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-01</td><td className="px-4 py-3 text-right font-medium text-morandi-sage">82</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
