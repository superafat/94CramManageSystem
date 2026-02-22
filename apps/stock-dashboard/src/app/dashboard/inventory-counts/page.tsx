'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type CountTask = {
  id: string;
  name: string;
  status: string;
  warehouseId: string;
  createdAt: string;
};

type Warehouse = { id: string; name: string };

export default function InventoryCountsPage() {
  const [rows, setRows] = useState<CountTask[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [form, setForm] = useState({ warehouseId: '', name: '' });

  const load = async () => {
    const [countsRes, warehousesRes] = await Promise.all([
      api.get('/inventory-counts'),
      api.get('/warehouses'),
    ]);
    setRows(countsRes.data);
    setWarehouses(warehousesRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('載入盤點任務失敗'));
  }, []);

  const createTask = async () => {
    if (!form.name || !form.warehouseId) return;
    try {
      await api.post('/inventory-counts', form);
      setForm({ warehouseId: '', name: '' });
      toast.success('盤點任務已建立');
      await load();
    } catch {
      toast.error('建立盤點任務失敗');
    }
  };

  const start = async (id: string) => {
    try {
      await api.post(`/inventory-counts/${id}/start`);
      toast.success('已開始盤點');
      await load();
    } catch {
      toast.error('開始盤點失敗');
    }
  };

  const complete = async (id: string) => {
    try {
      await api.post(`/inventory-counts/${id}/complete`);
      toast.success('盤點已完成');
      await load();
    } catch {
      toast.error('完成盤點失敗');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">盤點管理</h2>
      <div className="bg-white border rounded p-4 grid md:grid-cols-3 gap-2">
        <select className="border rounded px-2 py-2" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
          <option value="">選擇倉庫</option>
          {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input className="border rounded px-2 py-2" placeholder="盤點任務名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <button className="px-3 py-2 rounded bg-[#8FA895] text-white" onClick={createTask}>建立任務</button>
      </div>
      <div className="bg-white rounded border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-2 text-left">任務名稱</th><th className="p-2 text-left">狀態</th><th className="p-2 text-left">建立時間</th><th className="p-2 text-left">操作</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2"><Link className="text-[#6f8d75]" href={`/dashboard/inventory-counts/${row.id}`}>{row.name}</Link></td>
                <td className="p-2">{row.status}</td>
                <td className="p-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-2 space-x-2">
                  {row.status === 'draft' ? <button className="text-blue-600" onClick={() => start(row.id)}>開始</button> : null}
                  {row.status === 'counting' ? <button className="text-green-700" onClick={() => complete(row.id)}>完成</button> : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-3 text-gray-500" colSpan={4}>尚無盤點任務</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
