'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import toast, { Toaster } from 'react-hot-toast';
import { DemoBanner } from '@/components/DemoBanner';

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

const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending: '待審核',
  approved: '已核准',
  received: '已到貨',
  cancelled: '已取消',
};

const badgeClasses: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const DEMO_ORDERS: PurchaseOrderListItem[] = [
  { order: { id: 'demo-po-1', status: 'draft', orderDate: new Date().toISOString(), totalAmount: '15000' }, supplierName: '大華文具批發', warehouseName: '總部倉庫' },
  { order: { id: 'demo-po-2', status: 'pending', orderDate: new Date(Date.now() - 86400000).toISOString(), totalAmount: '8500' }, supplierName: '全國紙業', warehouseName: '分校倉庫' },
  { order: { id: 'demo-po-3', status: 'approved', orderDate: new Date(Date.now() - 172800000).toISOString(), totalAmount: '22000' }, supplierName: '大華文具批發', warehouseName: '總部倉庫' },
  { order: { id: 'demo-po-4', status: 'received', orderDate: new Date(Date.now() - 604800000).toISOString(), totalAmount: '12000' }, supplierName: '全國紙業', warehouseName: '分校倉庫' },
];
const DEMO_SUPPLIERS = [{ id: 'sup-1', name: '大華文具批發' }, { id: 'sup-2', name: '全國紙業' }];
const DEMO_WAREHOUSES = [{ id: 'wh-1', name: '總部倉庫' }, { id: 'wh-2', name: '分校倉庫' }];

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ supplierId: '', warehouseId: '', notes: '' });
  const [isDemo, setIsDemo] = useState(false);
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
      setIsDemo(false);
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      setOrders(DEMO_ORDERS);
      setSuppliers(DEMO_SUPPLIERS);
      setWarehouses(DEMO_WAREHOUSES);
      setIsDemo(true);
      toast.error('API 連線失敗，已切換至 Demo 模式（顯示示範資料）');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createOrder = async () => {
    if (!form.warehouseId) {
      toast.error('請選擇倉庫');
      return;
    }

    if (isDemo) {
      const warehouse = DEMO_WAREHOUSES.find(w => w.id === form.warehouseId);
      const supplier = DEMO_SUPPLIERS.find(s => s.id === form.supplierId);
      const newOrder: PurchaseOrderListItem = {
        order: {
          id: `demo-po-${Date.now()}`,
          status: 'draft',
          orderDate: new Date().toISOString(),
          totalAmount: null,
        },
        supplierName: supplier?.name ?? null,
        warehouseName: warehouse?.name ?? form.warehouseId,
      };
      setOrders(prev => [newOrder, ...prev]);
      setForm({ supplierId: '', warehouseId: '', notes: '' });
      toast.success('進貨單已新增（Demo）');
      return;
    }

    try {
      const payload: Record<string, string | undefined> = {
        warehouseId: form.warehouseId,
      };
      if (form.supplierId) payload.supplierId = form.supplierId;
      if (form.notes.trim()) payload.notes = form.notes;

      const res = await api.post('/purchase-orders', payload);
      const created = res.data?.order ?? res.data;
      console.log('Created purchase order:', created);
      toast.success('進貨單已新增');
      setForm({ supplierId: '', warehouseId: '', notes: '' });
      await load();
    } catch (err: unknown) {
      console.error('Failed to create purchase order:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message ? `新增失敗：${message}` : '新增進貨單失敗，請確認資料後重試');
    }
  };

  const updateStatus = async (id: string, action: 'submit' | 'approve' | 'receive') => {
    if (isDemo) {
      const actionLabel = action === 'submit' ? '送審' : action === 'approve' ? '核准' : '確認到貨';
      const nextStatus = action === 'submit' ? 'pending' : action === 'approve' ? 'approved' : 'received';
      setOrders(prev => prev.map(o => o.order.id === id ? { ...o, order: { ...o.order, status: nextStatus } } : o));
      toast.success(`已${actionLabel}（Demo）`);
      return;
    }
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
      <Toaster position="top-right" />
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">進貨單管理</h2>
      </div>

      {isDemo && <DemoBanner />}

      {/* 新增表單 */}
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
          <button className="bg-[#8FA895] text-white rounded px-3 py-2 hover:bg-[#7a9880] transition-colors" onClick={createOrder}>
            新增進貨單
          </button>
        </div>
      </div>

      {/* 進貨單列表 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">單號</th>
              <th className="p-2 text-left">供應商</th>
              <th className="p-2 text-left">倉庫</th>
              <th className="p-2 text-left">狀態</th>
              <th className="p-2 text-left">金額</th>
              <th className="p-2 text-left">日期</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-500">尚無進貨單</td>
              </tr>
            ) : orders.map((row) => (
              <tr key={row.order.id} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  {isDemo ? (
                    <span className="text-gray-500 font-mono text-xs">{row.order.id.slice(0, 12)}</span>
                  ) : (
                    <Link href={`/dashboard/purchase-orders/${row.order.id}`} className="text-[#6f8d75] hover:underline font-mono text-xs">
                      {row.order.id.slice(0, 8)}
                    </Link>
                  )}
                </td>
                <td className="p-2">{row.supplierName || '-'}</td>
                <td className="p-2">{row.warehouseName}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs ${badgeClasses[row.order.status] || badgeClasses.draft}`}>
                    {STATUS_LABELS[row.order.status] ?? row.order.status}
                  </span>
                </td>
                <td className="p-2">
                  {row.order.totalAmount ? `NT$ ${Number(row.order.totalAmount).toLocaleString()}` : '-'}
                </td>
                <td className="p-2">{new Date(row.order.orderDate).toLocaleDateString('zh-TW')}</td>
                <td className="p-2 space-x-2">
                  {row.order.status === 'draft' && (
                    <button className="text-amber-700 hover:text-amber-900" onClick={() => updateStatus(row.order.id, 'submit')}>送審</button>
                  )}
                  {row.order.status === 'pending' && user?.role === 'admin' && (
                    <button className="text-blue-700 hover:text-blue-900" onClick={() => updateStatus(row.order.id, 'approve')}>核准</button>
                  )}
                  {row.order.status === 'approved' && (
                    <button className="text-green-700 hover:text-green-900" onClick={() => updateStatus(row.order.id, 'receive')}>確認到貨</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
