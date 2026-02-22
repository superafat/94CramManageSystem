'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

type Prediction = {
  id: string;
  itemId: string;
  warehouseId: string;
  predictionType: string;
  predictedQuantity: number;
  confidence: string | null;
  reason: string | null;
  appliedAt: string | null;
  createdAt: string;
};

export default function AiPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [form, setForm] = useState({ schoolYear: '', semester: 'spring', classCount: 1, studentCount: 1 });
  const [running, setRunning] = useState(false);

  const load = async () => {
    const res = await api.get<Prediction[]>('/ai/predictions');
    setPredictions(res.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('載入 AI 預測失敗'));
  }, []);

  const runSemester = async () => {
    setRunning(true);
    try {
      await api.post('/ai/predictions/semester', form);
      toast.success('學期備貨預測完成');
      await load();
    } catch {
      toast.error('學期備貨預測失敗');
    } finally {
      setRunning(false);
    }
  };

  const runAutoReorder = async () => {
    setRunning(true);
    try {
      await api.post('/ai/predictions/auto-reorder');
      toast.success('自動補貨分析完成');
      await load();
    } catch {
      toast.error('自動補貨分析失敗');
    } finally {
      setRunning(false);
    }
  };

  const apply = async (id: string) => {
    try {
      await api.post(`/ai/predictions/${id}/apply`);
      toast.success('已轉為進貨單');
      await load();
    } catch {
      toast.error('轉單失敗');
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold text-gray-900">AI 智能</h2>

      <div className="bg-white border rounded-lg p-4 grid md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-2" placeholder="學年 (例: 2026)" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} />
        <select className="border rounded px-2 py-2" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}>
          <option value="spring">spring</option>
          <option value="summer">summer</option>
          <option value="fall">fall</option>
          <option value="winter">winter</option>
        </select>
        <input className="border rounded px-2 py-2" type="number" min={1} value={form.classCount} onChange={(e) => setForm({ ...form, classCount: Number(e.target.value) })} placeholder="班級數" />
        <input className="border rounded px-2 py-2" type="number" min={1} value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: Number(e.target.value) })} placeholder="學生數" />
        <button className="bg-[#8FA895] text-white rounded px-3 py-2 disabled:opacity-50" disabled={running} onClick={runSemester}>執行學期預測</button>
        <div className="md:col-span-5">
          <button className="bg-gray-700 text-white rounded px-3 py-2 disabled:opacity-50" disabled={running} onClick={runAutoReorder}>執行自動補貨分析</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">類型</th>
              <th className="p-2 text-left">預測數量</th>
              <th className="p-2 text-left">信心指數</th>
              <th className="p-2 text-left">原因</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {predictions.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.predictionType}</td>
                <td className="p-2">{row.predictedQuantity}</td>
                <td className="p-2">{row.confidence || '-'}</td>
                <td className="p-2">{row.reason || '-'}</td>
                <td className="p-2">
                  <button
                    className="text-[#6f8d75] disabled:text-gray-400"
                    disabled={Boolean(row.appliedAt)}
                    onClick={() => apply(row.id)}
                  >
                    {row.appliedAt ? '已轉單' : '轉為進貨單'}
                  </button>
                </td>
              </tr>
            ))}
            {predictions.length === 0 ? (
              <tr><td className="p-3 text-gray-500" colSpan={5}>尚無預測資料</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
