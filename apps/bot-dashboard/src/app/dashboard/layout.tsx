import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bot-bg">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile header */}
      <MobileHeader />

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}

function MobileHeader() {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#d8d3de] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-bold text-[#4b4355] text-sm">94CramBot</span>
        </div>
        <div className="text-xs text-[#7b7387]">管理面板</div>
      </div>
    </header>
  )
}

function MobileBottomNav() {
  const items = [
    { icon: '🏠', label: '首頁', href: '/dashboard' },
    { icon: '🏫', label: '千里眼', href: '/dashboard/clairvoyant' },
    { icon: '👨‍👩‍👧', label: '順風耳', href: '/dashboard/parent-bot' },
    { icon: '📊', label: '用量', href: '/dashboard/usage' },
    { icon: '⚙️', label: '設定', href: '/dashboard/settings' },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#d8d3de] safe-area-bottom">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-1 text-[#7b7387] hover:text-[#A89BB5] transition"
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </a>
        ))}
      </div>
    </nav>
  )
}
