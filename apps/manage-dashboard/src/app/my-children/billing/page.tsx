'use client'

export default function MyChildrenBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">繳費查詢</h1>
        <p className="text-text-muted mt-1">查看孩子的繳費狀況</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface rounded-2xl border border-border p-6">
          <p className="text-sm text-text-muted">待繳金額</p>
          <p className="text-2xl font-bold text-morandi-rose mt-1">$4,500</p>
        </div>
        <div className="bg-surface rounded-2xl border border-border p-6">
          <p className="text-sm text-text-muted">已繳金額</p>
          <p className="text-2xl font-bold text-morandi-sage mt-1">$13,500</p>
        </div>
      </div>
      
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">項目</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">到期日</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">金額</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">狀態</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="px-4 py-3 text-sm">2月份學費</td><td className="px-4 py-3 text-sm text-text-muted">2026-02-28</td><td className="px-4 py-3 text-right">$4,500</td><td className="px-4 py-3 text-right"><span className="px-2 py-1 bg-morandi-rose/10 text-morandi-rose text-xs rounded-lg">待繳</span></td></tr>
            <tr><td className="px-4 py-3 text-sm">1月份學費</td><td className="px-4 py-3 text-sm text-text-muted">2026-01-28</td><td className="px-4 py-3 text-right">$4,500</td><td className="px-4 py-3 text-right"><span className="px-2 py-1 bg-morandi-sage/10 text-morandi-sage text-xs rounded-lg">已繳</span></td></tr>
            <tr><td className="px-4 py-3 text-sm">12月份學費</td><td className="px-4 py-3 text-sm text-text-muted">2025-12-28</td><td className="px-4 py-3 text-right">$4,500</td><td className="px-4 py-3 text-right"><span className="px-2 py-1 bg-morandi-sage/10 text-morandi-sage text-xs rounded-lg">已繳</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
