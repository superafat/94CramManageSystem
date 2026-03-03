'use client';

import { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import { DemoBanner } from '@/components/DemoBanner';

type Item = { id: string; name: string };
type Row = { barcode: { id: string; itemId: string; barcode: string; barcodeType: string; isPrimary: boolean }; itemName: string };

type ScanRecord = {
  barcode: string;
  itemName: string;
  itemId: string;
  expectedQty?: number;
  actualQty: number;
};

const DEMO_BARCODES: Row[] = [
  { barcode: { id: 'demo-1', itemId: 'item-1', barcode: '4710088123456', barcodeType: 'ean13', isPrimary: true }, itemName: '白板筆（紅）' },
  { barcode: { id: 'demo-2', itemId: 'item-2', barcode: '4710088123457', barcodeType: 'ean13', isPrimary: true }, itemName: '白板筆（藍）' },
  { barcode: { id: 'demo-3', itemId: 'item-3', barcode: '4710088123458', barcodeType: 'code128', isPrimary: false }, itemName: 'A4 影印紙' },
  { barcode: { id: 'demo-4', itemId: 'item-4', barcode: '4710088123459', barcodeType: 'qr', isPrimary: true }, itemName: '資料夾（透明）' },
  { barcode: { id: 'demo-5', itemId: 'item-5', barcode: '4710088123460', barcodeType: 'code128', isPrimary: true }, itemName: '簽字筆（黑）' },
];
const DEMO_ITEMS: Item[] = [
  { id: 'item-1', name: '白板筆（紅）' },
  { id: 'item-2', name: '白板筆（藍）' },
  { id: 'item-3', name: 'A4 影印紙' },
  { id: 'item-4', name: '資料夾（透明）' },
  { id: 'item-5', name: '簽字筆（黑）' },
];

export default function BarcodesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [isDemo, setIsDemo] = useState(false);
  const [form, setForm] = useState({ itemId: '', barcode: '', barcodeType: 'code128', isPrimary: false });

  // 盤點模式狀態
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<{ itemName: string; itemId: string } | null>(null);
  const [scanQty, setScanQty] = useState(1);
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const [barcodeRes, itemsRes] = await Promise.all([api.get('/barcodes'), api.get('/items')]);
      setRows(barcodeRes.data);
      setItems(itemsRes.data);
      setIsDemo(false);
    } catch {
      setRows(DEMO_BARCODES);
      setItems(DEMO_ITEMS);
      setIsDemo(true);
      toast('已進入 Demo 模式（API 連線失敗）', { icon: 'ℹ️' });
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (scanning && scanRef.current) {
      scanRef.current.focus();
    }
  }, [scanning]);

  const submit = async () => {
    if (!form.itemId || !form.barcode) return;
    if (isDemo) {
      const item = items.find(i => i.id === form.itemId);
      setRows(prev => [...prev, {
        barcode: { id: `demo-${Date.now()}`, itemId: form.itemId, barcode: form.barcode, barcodeType: form.barcodeType, isPrimary: form.isPrimary },
        itemName: item?.name ?? form.itemId,
      }]);
      setForm({ itemId: '', barcode: '', barcodeType: 'code128', isPrimary: false });
      toast.success('條碼已新增（Demo）');
      return;
    }
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
    if (isDemo) {
      setRows(prev => prev.filter(r => r.barcode.id !== id));
      toast.success('條碼已刪除（Demo）');
      return;
    }
    try {
      await api.delete(`/barcodes/${id}`);
      toast.success('條碼已刪除');
      await load();
    } catch {
      toast.error('刪除條碼失敗');
    }
  };

  // 掃描查詢
  const handleScan = async () => {
    const code = scanInput.trim();
    if (!code) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      if (isDemo) {
        const found = DEMO_BARCODES.find(r => r.barcode.barcode === code);
        if (found) {
          setScanResult({ itemName: found.itemName, itemId: found.barcode.itemId });
        } else {
          toast.error(`找不到條碼：${code}`);
        }
      } else {
        const res = await api.get(`/barcodes/lookup/${code}`);
        setScanResult({ itemName: res.data.itemName, itemId: res.data.itemId });
      }
    } catch {
      toast.error(`找不到條碼：${code}`);
    } finally {
      setScanLoading(false);
      setScanQty(1);
    }
  };

  const addScanRecord = () => {
    if (!scanResult) return;
    setScanRecords(prev => {
      const existing = prev.findIndex(r => r.barcode === scanInput.trim());
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], actualQty: updated[existing].actualQty + scanQty };
        return updated;
      }
      return [...prev, { barcode: scanInput.trim(), itemName: scanResult.itemName, itemId: scanResult.itemId, actualQty: scanQty }];
    });
    setScanInput('');
    setScanResult(null);
    setScanQty(1);
    if (scanRef.current) scanRef.current.focus();
    toast.success(`已記錄：${scanResult.itemName} x${scanQty}`);
  };

  const finishInventory = () => {
    if (scanRecords.length === 0) {
      toast.error('尚無盤點記錄');
      return;
    }
    const summary = scanRecords.map(r => `${r.itemName}: ${r.actualQty}`).join('\n');
    toast.success(`盤點完成！共 ${scanRecords.length} 個品項\n${summary}`, { duration: 5000 });
    setScanning(false);
    setScanRecords([]);
    setScanInput('');
    setScanResult(null);
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />

      {/* 頁面標題列 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">條碼管理</h2>
        <button
          className="px-4 py-2 rounded bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
          onClick={() => { setScanning(true); setScanRecords([]); setScanInput(''); setScanResult(null); }}
        >
          開始盤點
        </button>
      </div>

      {isDemo && <DemoBanner />}

      {/* 盤點 Modal */}
      {scanning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal 標題 */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">盤點掃描模式</h3>
              <button
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                onClick={() => { setScanning(false); setScanRecords([]); setScanInput(''); setScanResult(null); }}
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 掃描輸入區 */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600">請掃描或輸入條碼，按 Enter 查詢</p>
                <div className="flex gap-2">
                  <input
                    ref={scanRef}
                    className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
                    placeholder="條碼..."
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleScan(); }}
                    autoFocus
                  />
                  <button
                    className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9880] transition-colors disabled:opacity-50"
                    onClick={handleScan}
                    disabled={scanLoading}
                  >
                    {scanLoading ? '查詢中...' : '查詢'}
                  </button>
                </div>
              </div>

              {/* 查詢結果 */}
              {scanResult && (
                <div className="bg-[#f5f8f5] border border-[#8FA895] rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">查詢到品項</p>
                    <p className="font-semibold text-gray-900">{scanResult.itemName}</p>
                    <p className="text-xs text-gray-400 font-mono">{scanInput}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-700">實際數量：</label>
                    <input
                      type="number"
                      min={0}
                      className="w-24 border rounded px-2 py-1 text-center focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
                      value={scanQty}
                      onChange={e => setScanQty(Number(e.target.value))}
                    />
                    <button
                      className="px-4 py-1.5 bg-[#8FA895] text-white rounded hover:bg-[#7a9880] transition-colors"
                      onClick={addScanRecord}
                    >
                      加入記錄
                    </button>
                  </div>
                </div>
              )}

              {/* 盤點記錄列表 */}
              {scanRecords.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">本次盤點記錄（{scanRecords.length} 項）</p>
                  <div className="border rounded overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">條碼</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500">品項</th>
                          <th className="px-3 py-2 text-right text-xs text-gray-500">數量</th>
                          <th className="px-3 py-2 text-left text-xs text-gray-500"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {scanRecords.map((rec) => (
                          <tr key={rec.barcode} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs text-gray-500">{rec.barcode}</td>
                            <td className="px-3 py-2 text-gray-900">{rec.itemName}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">{rec.actualQty}</td>
                            <td className="px-3 py-2">
                              <button
                                className="text-red-500 text-xs hover:text-red-700"
                                onClick={() => setScanRecords(prev => prev.filter(r => r.barcode !== rec.barcode))}
                              >
                                移除
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal 底部 */}
            <div className="px-6 py-4 border-t flex justify-between items-center">
              <span className="text-sm text-gray-500">已掃描 {scanRecords.length} 個品項</span>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                  onClick={() => { setScanning(false); setScanRecords([]); setScanInput(''); setScanResult(null); }}
                >
                  取消
                </button>
                <button
                  className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9880] transition-colors disabled:opacity-40"
                  onClick={finishInventory}
                  disabled={scanRecords.length === 0}
                >
                  完成盤點
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增條碼表單 */}
      {items.length === 0 ? (
        <div className="bg-white border rounded p-4 text-center text-gray-500">
          尚無品項資料，請先至<a href="/dashboard/items" className="text-[#6f8d75] underline mx-1">品項管理</a>新增品項後再設定條碼
        </div>
      ) : (
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
          <button className="px-3 py-2 rounded bg-[#8FA895] text-white hover:bg-[#7a9880] transition-colors" onClick={submit}>新增條碼</button>
        </div>
      )}

      {/* 條碼列表 */}
      <div className="bg-white rounded border overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">品項</th>
              <th className="p-2 text-left">條碼</th>
              <th className="p-2 text-left">類型</th>
              <th className="p-2 text-left">主要</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.barcode.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{row.itemName}</td>
                <td className="p-2 font-mono text-xs">{row.barcode.barcode}</td>
                <td className="p-2">{row.barcode.barcodeType.toUpperCase()}</td>
                <td className="p-2">{row.barcode.isPrimary ? <span className="text-[#8FA895] font-medium">主要</span> : <span className="text-gray-400">-</span>}</td>
                <td className="p-2"><button className="text-red-600 hover:text-red-800" onClick={() => remove(row.barcode.id)}>刪除</button></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td className="p-3 text-gray-500" colSpan={5}>尚無條碼資料</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
