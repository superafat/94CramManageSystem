interface StatCardProps {
  icon: string
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
}

export function StatCard({ icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-surface rounded-2xl p-6 border border-border hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm mb-1">{label}</p>
          <p className="text-2xl font-semibold text-text">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trendUp ? 'text-morandi-sage' : 'text-morandi-rose'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
  )
}
