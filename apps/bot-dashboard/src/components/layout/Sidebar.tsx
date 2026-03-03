'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { icon: '🏠', label: '首頁', href: '/dashboard' },
  { icon: '🏫', label: '千里眼管理', href: '/dashboard/clairvoyant' },
  { icon: '👨‍👩‍👧', label: '順風耳管理', href: '/dashboard/parent-bot' },
  { icon: '📊', label: '用量統計', href: '/dashboard/usage' },
  { icon: '⚙️', label: '設定', href: '/dashboard/settings' },
  { icon: '📚', label: '使用說明', href: '/dashboard/guide' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  function handleLogout() {
    document.cookie = 'token=; path=/; max-age=0'
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-[#d8d3de] flex flex-col z-50">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[#d8d3de]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🤖</span>
          <div>
            <div className="font-bold text-[#4b4355] text-sm">蜂神榜 補習班 Ai 助手系統</div>
            <div className="text-[10px] text-[#7b7387]">AI 助手管理面板</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                isActive
                  ? 'bg-[#A89BB5]/10 text-[#A89BB5] font-medium'
                  : 'text-[#5d5468] hover:bg-[#F5F0F7] hover:text-[#4b4355]'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-[#d8d3de] space-y-1">
        <a
          href="https://94cram.com"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#5d5468] hover:bg-[#F5F0F7] hover:text-[#4b4355] transition w-full"
        >
          <span className="text-lg">🏠</span>
          返回首頁
        </a>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#7b7387] hover:bg-red-50 hover:text-red-500 transition w-full"
        >
          <span className="text-lg">🚪</span>
          登出
        </button>
      </div>
    </aside>
  )
}
