'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import toast from 'react-hot-toast';

type PurchaseOrderListItem = {
  order: {
    id: string;
    status: string;
    orderDate: string;
    totalAmount: string | null;
  };
  supplierName: string | null;
  warehouseName: string;
};

const badgeClasses: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', notes: '' });
  const user = getCurrentUser();

  const load = async () => {
    try {
      const [ordersRes, suppliersRes, warehousesRes] = await Promise.all([
        api.get<PurchaseOrderListItem[]>('/purchase-orders'),
        api.get<Array<{ id: string; name: string }>>('/suppliers'),
        api.get<Array<{ id: string; name: string }>>('/warehouses'),
      ]);
      setOrders(ordersRes.data);
      setSuppliers(suppliersRes.data);
      setWarehouses(warehousesRes.data);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      toast.error('載入進貨單資料失敗');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createOrder = async () => {
    if (!form.warehouseId) return;
    try {
      await api.post('/purchase-orders', {
        warehouseId: form.warehouseId,
        supplierId: form.supplierId || null,
        notes: form.notes,
      });
      setForm({ supplierId: '', warehouseId: '', notes: '' });
      await load();
    } catch (err) {
      console.error('Failed to create purchase order:', err);
      toast.error('新增進貨單失敗');
    }
  };

  const updateStatus = async (id: string, action: 'submit' | 'approve' | 'receive') => {
    try {
      await api.post(`/purchase-orders/${id}/${action}`);
      await load();
    } catch (err) {
      console.error('Failed to update purchase order status:', err);
      toast.error('更新進貨單狀態失敗');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">進貨單管理</h2>

      <div className="bg-white border rounded-lg p-4 grid md:grid-cols-3 gap-2">
        <select className="border rounded px-2 py-2" value={form.warehouseId} onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}>
          <option value="">選擇倉庫</option>
          {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
        </select>
        <select className="border rounded px-2 py-2" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
          <option value="">選擇供應商（可選）</option>
          {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
        </select>
        <input className="border rounded px-2 py-2" placeholder="備註" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="md:col-span-3">
          <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={createOrder}>新增進貨單</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">單號</th>
              <th className="p-2 text-left">供應商</th>
              <th className="p-2 text-left">倉庫</th>
              <th className="p-2 text-left">狀態</th>
              <th className="p-2 text-left">日期</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((row) => (
              <tr key={row.order.id} className="border-t">
                <td className="p-2">
                  <Link href={`/dashboard/purchase-orders/${row.order.id}`} className="text-[#6f8d75]">
                    {row.order.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="p-2">{row.supplierName || '-'}</td>
                <td className="p-2">{row.warehouseName}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${badgeClasses[row.order.status] || badgeClasses.draft}`}>{row.order.status}</span>
                </td>
                <td className="p-2">{new Date(row.order.orderDate).toLocaleDateString()}</td>
                <td className="p-2 space-x-2">
                  {row.order.status === 'draft' && <button className="text-amber-700" onClick={() => updateStatus(row.order.id, 'submit')}>送審</button>}
                  {row.order.status === 'pending' && user?.role === 'admin' && <button className="text-blue-700" onClick={() => updateStatus(row.order.id, 'approve')}>核准</button>}
                  {row.order.status === 'approved' && <button className="text-green-700" onClick={() => updateStatus(row.order.id, 'receive')}>確認到貨</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
