'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mobileNavItems = [
  { href: '/dashboard', icon: '📊', label: '總覽' },
  { href: '/dashboard/clairvoyant', icon: '🏫', label: '千里眼' },
  { href: '/dashboard/windear', icon: '👨‍👩‍👧', label: '順風耳' },
  { href: '/dashboard/wentaishi', icon: '🤖', label: '聞太師' },
  { href: '/dashboard/plans', icon: '💎', label: '方案' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-30 safe-area-bottom">
      <div className="flex justify-around items-center h-16">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                isActive ? 'text-primary' : 'text-text-muted'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
