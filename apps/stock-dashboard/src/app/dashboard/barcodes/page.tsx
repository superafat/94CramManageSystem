'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

type Item = { id: string; name: string };
type Row = { barcode: { id: string; itemId: string; barcode: string; barcodeType: string; isPrimary: boolean }; itemName: string };

export default function BarcodesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ itemId: '', barcode: '', barcodeType: 'code128', isPrimary: false });

  const load = async () => {
    const [barcodeRes, itemsRes] = await Promise.all([api.get('/barcodes'), api.get('/items')]);
    setRows(barcodeRes.data);
    setItems(itemsRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('載入條碼資料失敗'));
  }, []);

  const submit = async () => {
    if (!form.itemId || !form.barcode) return;
    try {
      await api.post('/barcodes', form);
      setForm({ itemId: '', barcode: '', barcodeType: 'code128', isPrimary: false });
      toast.success('條碼已新增');
      await load();
    } catch {
      toast.error('新增條碼失敗');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/barcodes/${id}`);
      toast.success('條碼已刪除');
      await load();
    } catch {
      toast.error('刪除條碼失敗');
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold text-gray-900">條碼管理</h2>
      <div className="bg-white border rounded p-4 grid md:grid-cols-4 gap-2">
        <select className="border rounded px-2 py-2" value={form.itemId} onChange={(e) => setForm({ ...form, itemId: e.target.value })}>
          <option value="">選擇品項</option>
          {items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input className="border rounded px-2 py-2" placeholder="條碼" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        <select className="border rounded px-2 py-2" value={form.barcodeType} onChange={(e) => setForm({ ...form, barcodeType: e.target.value })}>
          <option value="code128">Code128</option>
          <option value="ean13">EAN13</option>
          <option value="qr">QR</option>
        </select>
        <button className="px-3 py-2 rounded bg-[#8FA895] text-white" onClick={submit}>新增條碼</button>
      </div>

      <div className="bg-white rounded border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="p-2 text-left">品項</th><th className="p-2 text-left">條碼</th><th className="p-2 text-left">類型</th><th className="p-2 text-left">操作</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.barcode.id} className="border-t">
                <td className="p-2">{row.itemName}</td>
                <td className="p-2">{row.barcode.barcode}</td>
                <td className="p-2">{row.barcode.barcodeType}</td>
                <td className="p-2"><button className="text-red-600" onClick={() => remove(row.barcode.id)}>刪除</button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-3 text-gray-500" colSpan={4}>尚無條碼資料</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
