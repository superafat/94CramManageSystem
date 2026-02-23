'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

type ItemRow = {
  purchaseItem: { itemId: string; quantity: number };
  item: { id: string; name: string };
};

type PurchaseOrderDetail = {
  id: string;
  status: string;
  supplierId: string | null;
  warehouseId: string;
  notes: string | null;
  items: ItemRow[];
};

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const user = getCurrentUser();
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [newItem, setNewItem] = useState({ itemId: '', quantity: 1, unitPrice: 0, totalPrice: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const id = params.id;

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [detailRes, itemsRes] = await Promise.all([
        api.get<PurchaseOrderDetail>(`/purchase-orders/${id}`),
        api.get<Array<{ id: string; name: string }>>('/items'),
      ]);
      setDetail(detailRes.data);
      setItems(itemsRes.data);
    } catch (err) {
      setError('載入進貨單失敗');
      console.error('Failed to load purchase order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const updateStatus = async (action: 'submit' | 'approve' | 'receive' | 'cancel') => {
    try {
      await api.post(`/purchase-orders/${id}/${action}`);
      await load();
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('操作失敗，請稍後再試');
    }
  };

  const addItem = async () => {
    if (!newItem.itemId || !newItem.quantity) return;
    try {
      await api.post(`/purchase-orders/${id}/items`, newItem);
      setNewItem({ itemId: '', quantity: 1, unitPrice: 0, totalPrice: 0 });
      await load();
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('新增品項失敗');
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await api.delete(`/purchase-orders/${id}/items/${itemId}`);
      await load();
    } catch (err) {
      console.error('Failed to remove item:', err);
      alert('移除品項失敗');
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[#8FA895] mb-3"></div>
          <p className="text-sm text-gray-500">載入進貨單資料中...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="space-y-4">
        <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/purchase-orders')}>← 返回進貨單列表</button>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  // Not Found State
  if (!detail) {
    return (
      <div className="space-y-4">
        <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/purchase-orders')}>← 返回進貨單列表</button>
        <div className="bg-white border rounded-lg p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">找不到此進貨單</h3>
          <p className="text-sm text-gray-500 mb-4">進貨單可能已被刪除或不存在</p>
          <button
            onClick={() => router.push('/dashboard/purchase-orders')}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            返回進貨單列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button className="text-sm text-gray-600" onClick={() => router.push('/dashboard/purchase-orders')}>← 返回進貨單列表</button>
      <h2 className="text-2xl font-bold text-gray-900">進貨單詳情 #{detail.id.slice(0, 8)}</h2>
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <p>狀態：<span className="font-semibold">{detail.status}</span></p>
        <p>備註：{detail.notes || '-'}</p>
        <div className="space-x-3">
          {detail.status === 'draft' && <button className="text-amber-700" onClick={() => updateStatus('submit')}>送審</button>}
          {detail.status === 'pending' && user?.role === 'admin' && <button className="text-blue-700" onClick={() => updateStatus('approve')}>核准</button>}
          {detail.status === 'approved' && <button className="text-green-700" onClick={() => updateStatus('receive')}>確認到貨</button>}
          {detail.status !== 'received' && detail.status !== 'cancelled' && <button className="text-red-700" onClick={() => updateStatus('cancel')}>取消</button>}
        </div>
      </div>

      {detail.status === 'draft' && (
        <div className="bg-white border rounded-lg p-4 grid md:grid-cols-4 gap-2">
          <select className="border rounded px-2 py-2" value={newItem.itemId} onChange={(e) => setNewItem({ ...newItem, itemId: e.target.value })}>
            <option value="">選擇品項</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input className="border rounded px-2 py-2" type="number" min={1} value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value || 0) })} />
          <input className="border rounded px-2 py-2" type="number" min={0} value={newItem.unitPrice} onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value || 0) })} />
          <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={addItem}>新增品項</button>
        </div>
      )}

      {/* Empty State - No Items */}
      {detail.items.length === 0 ? (
        <div className="bg-white border rounded-lg p-8 text-center">
          <div className="text-4xl mb-3">📦</div>
          <h3 className="text-base font-medium text-gray-900 mb-2">尚未新增品項</h3>
          <p className="text-sm text-gray-500">
            {detail.status === 'draft' ? '使用上方表單新增第一個品項' : '此進貨單沒有品項'}
          </p>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">品項</th>
                <th className="p-2 text-left">數量</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {detail.items.map((row) => (
                <tr key={row.item.id} className="border-t">
                  <td className="p-2">{row.item.name}</td>
                  <td className="p-2">{row.purchaseItem.quantity}</td>
                  <td className="p-2">
                    {detail.status === 'draft' && <button className="text-red-700" onClick={() => removeItem(row.item.id)}>移除</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
