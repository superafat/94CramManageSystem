'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type SummaryData = {
  totalItems: number;
  totalValue: number;
  lowStockCount: number;
  byWarehouse: Record<string, { count: number }>;
};

type TurnoverRow = {
  itemId: string;
  itemName: string;
  currentQty: number;
  monthlyOut: number;
  avgDailyUsage: number;
  inventoryDays: number | null;
  isStagnant: boolean;
};

type PurchasesData = {
  totalAmount: number;
  bySupplier: Array<{ supplierName: string | null; amount: number }>;
  byItem: Array<{ itemName: string; quantity: number }>;
};

type PromoData = {
  records: Array<{ transaction: { id: string; recipientName: string | null; quantity: number } }>;
  byRecipient: Array<{ recipient: string; quantity: number }>;
  byItem: Array<{ itemName: string; quantity: number }>;
};

type TabKey = 'summary' | 'turnover' | 'purchases' | 'promo';

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('summary');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [turnover, setTurnover] = useState<TurnoverRow[]>([]);
  const [purchases, setPurchases] = useState<PurchasesData | null>(null);
  const [promo, setPromo] = useState<PromoData | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadSummary = async () => {
    try {
      const res = await api.get<SummaryData>('/reports/summary');
      setSummary(res.data);
    } catch (err) {
      console.error('Failed to load summary:', err);
      toast.error('載入庫存總覽失敗');
    }
  };
  const loadTurnover = async () => {
    try {
      const res = await api.get<TurnoverRow[]>('/reports/turnover');
      setTurnover(res.data);
    } catch (err) {
      console.error('Failed to load turnover:', err);
      toast.error('載入周轉分析失敗');
    }
  };
  const loadPurchases = async () => {
    try {
      const query = new URLSearchParams();
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const res = await api.get<PurchasesData>(`/reports/purchases?${query.toString()}`);
      setPurchases(res.data);
    } catch (err) {
      console.error('Failed to load purchases:', err);
      toast.error('載入進貨統計失敗');
    }
  };
  const loadPromo = async () => {
    try {
      const res = await api.get<PromoData>('/reports/promo-stats');
      setPromo(res.data);
    } catch (err) {
      console.error('Failed to load promo stats:', err);
      toast.error('載入公關品統計失敗');
    }
  };

  useEffect(() => {
    loadSummary();
    loadTurnover();
    loadPurchases();
    loadPromo();
  }, []);

  const byWarehouseChart = useMemo(
    () => Object.entries(summary?.byWarehouse || {}).map(([name, val]) => ({ name, count: val.count })),
    [summary],
  );

  const exportExcel = () => {
    let rows: Array<Record<string, string | number | null>> = [];
    if (tab === 'summary' && summary) {
      rows = byWarehouseChart.map((row) => ({ 倉庫: row.name, 品項數: row.count }));
    } else if (tab === 'turnover') {
      rows = turnover.map((row) => ({ 品項: row.itemName, 月出庫: row.monthlyOut, 平均日耗: row.avgDailyUsage, 庫存天數: row.inventoryDays }));
    } else if (tab === 'purchases' && purchases) {
      rows = purchases.bySupplier.map((row) => ({ 供應商: row.supplierName || '未指定', 金額: row.amount }));
    } else if (tab === 'promo' && promo) {
      rows = promo.byRecipient.map((row) => ({ 對象: row.recipient, 數量: row.quantity }));
    }
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'report');
    XLSX.writeFile(workbook, `94stock-${tab}-report.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">報表分析</h2>
        <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={exportExcel}>匯出 Excel</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'summary', label: '庫存總覽' },
          { key: 'turnover', label: '周轉分析' },
          { key: 'purchases', label: '進貨統計' },
          { key: 'promo', label: '公關品' },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key as TabKey)}
            className={`px-3 py-2 rounded ${tab === item.key ? 'bg-[#8FA895] text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && summary && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">總品項</p><p className="text-2xl font-bold">{summary.totalItems}</p></div>
            <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">低庫存</p><p className="text-2xl font-bold text-amber-600">{summary.lowStockCount}</p></div>
            <div className="bg-white border rounded-lg p-4"><p className="text-sm text-gray-500">庫存價值</p><p className="text-2xl font-bold">{summary.totalValue}</p></div>
          </div>
          <div className="bg-white border rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byWarehouseChart}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8FA895" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'turnover' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">呆滯品（30天零出庫）</h3>
            <ul className="text-sm space-y-1">
              {turnover.filter((row) => row.isStagnant).map((row) => <li key={row.itemId}>{row.itemName}</li>)}
            </ul>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">庫存天數（前10）</h3>
            <ul className="text-sm space-y-1">
              {turnover
                .filter((row) => row.inventoryDays !== null)
                .sort((a, b) => (b.inventoryDays || 0) - (a.inventoryDays || 0))
                .slice(0, 10)
                .map((row) => <li key={row.itemId}>{row.itemName}：{row.inventoryDays} 天</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab === 'purchases' && (
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4 flex flex-wrap items-center gap-2">
            <input type="date" className="border rounded px-2 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="border rounded px-2 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
            <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={loadPurchases}>更新區間</button>
          </div>
          <div className="bg-white border rounded-lg p-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={purchases?.bySupplier || []} dataKey="amount" nameKey="supplierName" label>
                  {(purchases?.bySupplier || []).map((_, index) => (
                    <Cell key={index} fill={['#8FA895', '#9db8a3', '#c6d8c9', '#7f9c86'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'promo' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">發放記錄</h3>
            <ul className="text-sm space-y-1">
              {(promo?.records || []).slice(0, 20).map((row) => (
                <li key={row.transaction.id}>{row.transaction.recipientName || '未指定'}：{Math.abs(row.transaction.quantity)}</li>
              ))}
            </ul>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-2">對象統計</h3>
            <ul className="text-sm space-y-1">
              {(promo?.byRecipient || []).map((row) => <li key={row.recipient}>{row.recipient}：{row.quantity}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
