export default function DashboardPage() {
  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#4b4355]">歡迎回來 👋</h1>
        <p className="text-sm text-[#7b7387] mt-1">94CramBot 管理面板 — 查看 Bot 狀態與用量統計</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '本月 AI Calls', value: '42', icon: '🤖', color: '#A89BB5' },
          { label: '千里眼用戶', value: '8', icon: '🏫', color: '#7B8FA1' },
          { label: '順風耳家長', value: '23', icon: '👨‍👩‍👧', color: '#C4A9A1' },
          { label: '今日訊息', value: '15', icon: '💬', color: '#A8B5A2' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-[#d8d3de] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-xs text-[#7b7387] font-medium">placeholder</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs text-[#7b7387] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Bot Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
          <h3 className="font-semibold text-[#4b4355] mb-3 flex items-center gap-2">
            🏫 千里眼狀態
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">Bot 狀態</span>
              <span className="text-[#A8B5A2] font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-[#A8B5A2] rounded-full inline-block" />
                運行中
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">已綁定帳號</span>
              <span className="text-[#4b4355] font-medium">3 個</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">本週操作</span>
              <span className="text-[#4b4355] font-medium">28 次</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#d8d3de] p-5 shadow-sm">
          <h3 className="font-semibold text-[#4b4355] mb-3 flex items-center gap-2">
            👨‍👩‍👧 順風耳狀態
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">Bot 狀態</span>
              <span className="text-[#A8B5A2] font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-[#A8B5A2] rounded-full inline-block" />
                運行中
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">已綁定家長</span>
              <span className="text-[#4b4355] font-medium">23 位</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#7b7387]">今日推播</span>
              <span className="text-[#4b4355] font-medium">7 則</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
