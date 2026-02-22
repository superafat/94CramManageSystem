'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import BarcodeScanner from '@/components/BarcodeScanner';

type CountItem = {
  countItem: {
    itemId: string;
    systemQuantity: number;
    countedQuantity: number | null;
    difference: number | null;
  };
  item: {
    id: string;
    name: string;
  };
};

export default function InventoryCountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [rows, setRows] = useState<CountItem[]>([]);
  const [barcode, setBarcode] = useState('');
  const [countedQuantity, setCountedQuantity] = useState(0);
  const [currentItemId, setCurrentItemId] = useState('');

  const load = async () => {
    const res = await api.get(`/inventory-counts/${id}/items`);
    setRows(res.data);
  };

  useEffect(() => {
    if (!id) return;
    load().catch(() => toast.error('載入盤點明細失敗'));
  }, [id]);

  const handleBarcode = async (value: string) => {
    setBarcode(value);
    try {
      const res = await api.get(`/barcodes/lookup/${encodeURIComponent(value)}`);
      setCurrentItemId(res.data.item.id);
      toast.success(`已對應品項：${res.data.item.name}`);
    } catch {
      toast.error('查無對應條碼');
    }
  };

  const submitCount = async () => {
    if (!currentItemId) return;
    await api.post(`/inventory-counts/${id}/items/${currentItemId}/count`, { countedQuantity, barcode });
    setCountedQuantity(0);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">盤點執行</h2>
      <div className="bg-white border rounded p-4 space-y-3">
        <BarcodeScanner onDetected={handleBarcode} />
        <div className="text-sm text-gray-700">目前條碼：{barcode || '-'}</div>
        <input type="number" className="border rounded px-3 py-2" value={countedQuantity} onChange={(e) => setCountedQuantity(Number(e.target.value || 0))} placeholder="實際數量" />
        <button className="px-3 py-2 rounded bg-[#8FA895] text-white" onClick={submitCount}>送出盤點數量</button>
      </div>

      <div className="bg-white border rounded overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-2 text-left">品項</th><th className="p-2 text-left">系統數量</th><th className="p-2 text-left">盤點數量</th><th className="p-2 text-left">差異</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item.id} className="border-t">
                <td className="p-2">{row.item.name}</td>
                <td className="p-2">{row.countItem.systemQuantity}</td>
                <td className="p-2">{row.countItem.countedQuantity ?? '-'}</td>
                <td className="p-2">{row.countItem.difference ?? '-'}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-3 text-gray-500" colSpan={4}>尚無盤點品項</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
