'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type DashboardData = {
  totalItems: number;
  totalInventoryValue: number;
  lowStockCount: number;
  warehouseCount: number;
  todayTransactions: number;
  monthTransactions: number;
  recentTransactions: Array<{
    transaction: { id: string; quantity: number; transactionType: string; createdAt: string };
    item: { name: string };
    warehouse: { name: string };
  }>;
  topItems: Array<{
    inventory: { quantity: number };
    item: { name: string; safetyStock: number | null };
  }>;
};

export default function DashboardHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await api.get<DashboardData>('/reports/dashboard');
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  if (loading) return <div className="text-gray-500">載入中...</div>;
  if (!data) return <div className="text-red-600">無法載入儀表板資料</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">儀表板總覽</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">總品項</p>
          <p className="text-2xl font-bold text-[#6f8d75]">{data.totalItems}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">低庫存品項</p>
          <p className="text-2xl font-bold text-amber-600">{data.lowStockCount}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">本月異動筆數</p>
          <p className="text-2xl font-bold text-[#6f8d75]">{data.monthTransactions}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">最近異動（5筆）</h3>
          <div className="space-y-2">
            {data.recentTransactions.map((row) => (
              <div key={row.transaction.id} className="flex items-center justify-between text-sm border-b pb-2">
                <div>
                  <p className="font-medium">{row.item.name}</p>
                  <p className="text-gray-500">{row.warehouse.name}</p>
                </div>
                <div className="text-right">
                  <p className={row.transaction.quantity < 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                    {row.transaction.quantity}
                  </p>
                  <p className="text-gray-400">{new Date(row.transaction.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-3">低庫存預警</h3>
          <div className="space-y-2">
            {data.topItems
              .filter((row) => row.inventory.quantity <= (row.item.safetyStock || 0))
              .map((row) => (
                <div key={row.item.name} className="flex items-center justify-between text-sm border-b pb-2">
                  <span>{row.item.name}</span>
                  <span className="text-amber-600 font-semibold">
                    {row.inventory.quantity} / 安全 {row.item.safetyStock || 0}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
