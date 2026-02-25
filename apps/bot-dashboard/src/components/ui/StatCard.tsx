interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: string;
  color?: string;
}

export default function StatCard({ icon, label, value, trend, color = '#A89BB5' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-[#d8d3de] p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[#7b7387] truncate">{label}</p>
          <p className="text-xl font-bold text-[#4b4355]">{value}</p>
        </div>
        {trend && (
          <span className="text-xs text-[#7b7387] whitespace-nowrap">{trend}</span>
        )}
      </div>
    </div>
  );
}
