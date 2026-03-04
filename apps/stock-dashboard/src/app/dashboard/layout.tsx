'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentUser, removeToken } from '@/lib/auth';

interface NavItem {
  href: string;
  icon: string;
  label: string;
  separator?: undefined;
}

interface NavSeparator {
  separator: string;
  href?: undefined;
  icon?: undefined;
  label?: undefined;
}

type NavEntry = NavItem | NavSeparator;

const navItems: NavEntry[] = [
  { href: '/dashboard', icon: '📊', label: '總覽' },
  // 庫存管理
  { separator: '庫存管理' },
  { href: '/dashboard/items', icon: '📦', label: '品項管理' },
  { href: '/dashboard/categories', icon: '🏷️', label: '分類管理' },
  { href: '/dashboard/inventory', icon: '🏪', label: '庫存總覽' },
  { href: '/dashboard/stock-in', icon: '📥', label: '入庫作業' },
  { href: '/dashboard/stock-out', icon: '📤', label: '出庫作業' },
  { href: '/dashboard/transfer', icon: '🔄', label: '調撥作業' },
  { href: '/dashboard/inventory-counts', icon: '📋', label: '盤點管理' },
  { href: '/dashboard/barcodes', icon: '🏷️', label: '條碼管理' },
  { href: '/dashboard/expiry', icon: '⏰', label: '過期監控' },
  // 採購管理
  { separator: '採購管理' },
  { href: '/dashboard/suppliers', icon: '🏭', label: '供應商管理' },
  { href: '/dashboard/purchase-orders', icon: '📝', label: '進貨單管理' },
  // 分析與設定
  { separator: '分析與設定' },
  { href: '/dashboard/reports', icon: '📈', label: '庫存報表' },
  { href: '/dashboard/ai', icon: '🤖', label: 'AI 智能' },
  { href: '/dashboard/notifications', icon: '🔔', label: '通知設定' },
  { href: '/dashboard/integrations', icon: '🔗', label: '系統整合' },
  { href: '/dashboard/guide', icon: '📚', label: '使用說明' },
];

const roleLabels: Record<string, string> = {
  admin: '館長',
  staff: '行政',
  warehouse: '倉管',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-screen bg-[#F5F0EB]">
        {/* Sidebar */}
        <aside className="w-64 bg-[#FDFBF8] border-r border-[#D8D1C6] flex flex-col">
          {/* Logo */}
          <div className="p-5 border-b border-[#D8D1C6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8FA895] flex items-center justify-center text-white text-xl">
                🐝
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-[#4B5C53] text-sm">94Stock</h1>
                <p className="text-xs text-[#8B8B8B]">庫存管理系統</p>
              </div>
            </div>
            {user && (
              <div className="mt-3 px-3 py-2 bg-[#8FA895]/10 rounded-lg">
                <p className="text-xs text-[#8B8B8B]">
                  {user.name || user.email || '使用者'}
                  <span className="ml-1 font-medium text-[#8FA895]">
                    {roleLabels[user.role || ''] || user.role || ''}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item, index) => {
              if ('separator' in item && item.separator) {
                return (
                  <div key={`sep-${index}`} className="pt-4 pb-1">
                    <div className="border-t border-[#D8D1C6]" />
                    <p className="text-xs text-[#8B8B8B] font-medium px-3 pt-3">
                      {item.separator}
                    </p>
                  </div>
                );
              }
              const navItem = item as NavItem;
              const isActive =
                pathname === navItem.href ||
                (navItem.href !== '/dashboard' && pathname?.startsWith(navItem.href));

              return (
                <Link
                  key={navItem.href}
                  href={navItem.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    isActive
                      ? 'bg-[#8FA895]/15 text-[#4B5C53] font-medium'
                      : 'text-[#6B746E] hover:bg-[#F5F0EB] hover:text-[#4B5C53]'
                  }`}
                >
                  <span className="text-base">{navItem.icon}</span>
                  <span>{navItem.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-[#D8D1C6] space-y-2">
            <a
              href="https://94cram.com"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-[#6B746E] bg-[#F5F0EB] border border-[#D8D1C6] rounded-xl hover:bg-[#E6DDD1] transition-colors"
            >
              🏠 返回首頁
            </a>
            <button
              onClick={() => {
                removeToken();
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-[#8FA895] rounded-xl hover:bg-[#7A9380] transition-colors"
            >
              🚪 登出
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 bg-[#FDFBF8] border-b border-[#D8D1C6] flex items-center justify-between px-6">
            <div className="font-medium text-[#4B5C53]">🐝 蜂神榜庫存管理</div>
            <div className="text-sm text-[#8B8B8B]">
              {user?.name || user?.email || '未登入'}
              {user?.role ? ` (${roleLabels[user.role] || user.role})` : ''}
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
