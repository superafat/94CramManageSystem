'use client';

import React from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { getCurrentUser, removeToken } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();

  return (
    <AuthGuard>
      <div className="flex h-screen bg-gray-50">
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">94Stock</h1>
          </div>
          <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
            <Link href="/dashboard" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">Dashboard</Link>
            <Link href="/dashboard/items" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">品項管理</Link>
            <Link href="/dashboard/inventory" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">庫存總覽</Link>
            <Link href="/dashboard/stock-in" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">入庫作業</Link>
            <Link href="/dashboard/stock-out" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">出庫作業</Link>
            <Link href="/dashboard/transfer" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">調撥作業</Link>
            <Link href="/dashboard/classes" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">班級管理</Link>
            <Link href="/dashboard/suppliers" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">供應商管理</Link>
            <Link href="/dashboard/purchase-orders" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">進貨單管理</Link>
            <Link href="/dashboard/reports" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">庫存報表</Link>
            <Link href="/dashboard/notifications" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">通知設定</Link>
            <Link href="/dashboard/ai" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">AI 智能</Link>
            <Link href="/dashboard/integrations" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">系統整合</Link>
            <Link href="/dashboard/students" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">學生管理</Link>
            <Link href="/dashboard/inventory-counts" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">盤點管理</Link>
            <Link href="/dashboard/barcodes" className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md">條碼管理</Link>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => {
                removeToken();
                window.location.href = '/login';
              }}
              className="w-full px-4 py-2 text-sm text-white bg-[#8FA895] rounded-md hover:bg-[#7a9380]"
            >
              登出
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="font-medium text-gray-600">補習班庫存系統</div>
            <div className="text-sm text-gray-500">{user?.name || user?.email || '未登入'} {user?.role ? `(${user.role})` : ''}</div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
