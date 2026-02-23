'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

type ClassRow = {
  id: string;
  name: string;
  grade?: string;
  subject?: string;
  schoolYear?: string;
  studentCount?: number;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', grade: '', subject: '', schoolYear: '', studentCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get('/classes');
      setClasses(res.data || []);
    } catch (err) {
      setError('載入班級資料失敗');
      console.error('Failed to load classes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setEditingId(null);
    setForm({ name: '', grade: '', subject: '', schoolYear: '', studentCount: 0 });
  };

  const submit = async () => {
    if (!form.name.trim()) return;
    try {
      if (editingId) {
        await api.put(`/classes/${editingId}`, form);
      } else {
        await api.post('/classes', form);
      }
      reset();
      await load();
    } catch (err) {
      console.error('Failed to save class:', err);
      alert('儲存失敗，請稍後再試');
    }
  };

  const edit = (row: ClassRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name || '',
      grade: row.grade || '',
      subject: row.subject || '',
      schoolYear: row.schoolYear || '',
      studentCount: row.studentCount || 0,
    });
  };

  const remove = async (id: string) => {
    if (!confirm('確定要刪除此班級嗎？')) return;
    try {
      await api.delete(`/classes/${id}`);
      await load();
    } catch (err) {
      console.error('Failed to delete class:', err);
      alert('刪除失敗，請稍後再試');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">班級管理</h2>

      {/* Form */}
      <div className="bg-white rounded border p-4 grid md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1" placeholder="班級名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="年級" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="科目" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="學年" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} />
        <input className="border rounded px-2 py-1" type="number" placeholder="學生數" value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: Number(e.target.value || 0) })} />
        <div className="md:col-span-5 flex gap-2">
          <button className="px-3 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors" onClick={submit}>{editingId ? '更新班級' : '新增班級'}</button>
          {editingId && <button className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors" onClick={reset}>取消編輯</button>}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white rounded border overflow-hidden">
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#8FA895] mb-3"></div>
            <p className="text-sm text-gray-500">載入中...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="bg-white rounded border p-8 text-center">
          <div className="text-4xl mb-3">😵</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error}</h3>
          <p className="text-sm text-gray-500 mb-4">請檢查網路連線或稍後再試</p>
          <button
            onClick={() => load()}
            className="px-4 py-2 bg-[#8FA895] text-white rounded hover:bg-[#7a9280] transition-colors"
          >
            重新載入
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && classes.length === 0 && (
        <div className="bg-white rounded border p-12 text-center">
          <div className="text-5xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">尚未建立任何班級</h3>
          <p className="text-sm text-gray-500 mb-4">使用上方表單新增第一個班級</p>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
            <span>📝 班級管理</span>
            <span>•</span>
            <span>📖 教材設定</span>
            <span>•</span>
            <span>👥 學生追蹤</span>
          </div>
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && classes.length > 0 && (
        <div className="bg-white rounded border overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">名稱</th>
                <th className="p-2 text-left">年級</th>
                <th className="p-2 text-left">科目</th>
                <th className="p-2 text-left">學年</th>
                <th className="p-2 text-left">學生數</th>
                <th className="p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((row) => (
                <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-2">{row.name}</td>
                  <td className="p-2">{row.grade || '-'}</td>
                  <td className="p-2">{row.subject || '-'}</td>
                  <td className="p-2">{row.schoolYear || '-'}</td>
                  <td className="p-2">{row.studentCount || 0}</td>
                  <td className="p-2 space-x-2">
                    <button className="text-blue-600 hover:underline" onClick={() => edit(row)}>編輯</button>
                    <button className="text-red-600 hover:underline" onClick={() => remove(row.id)}>刪除</button>
                    <Link className="text-[#8FA895] hover:underline" href={`/dashboard/classes/${row.id}`}>教材</Link>
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
