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

  const load = async () => {
    const res = await api.get('/classes');
    setClasses(res.data);
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
    if (editingId) {
      await api.put(`/classes/${editingId}`, form);
    } else {
      await api.post('/classes', form);
    }
    reset();
    await load();
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
    await api.delete(`/classes/${id}`);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">班級管理</h2>

      <div className="bg-white rounded border p-4 grid md:grid-cols-5 gap-2">
        <input className="border rounded px-2 py-1" placeholder="班級名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="年級" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="科目" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        <input className="border rounded px-2 py-1" placeholder="學年" value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} />
        <input className="border rounded px-2 py-1" type="number" placeholder="學生數" value={form.studentCount} onChange={(e) => setForm({ ...form, studentCount: Number(e.target.value || 0) })} />
        <div className="md:col-span-5 flex gap-2">
          <button className="px-3 py-2 bg-[#8FA895] text-white rounded" onClick={submit}>{editingId ? '更新班級' : '新增班級'}</button>
          {editingId && <button className="px-3 py-2 bg-gray-200 rounded" onClick={reset}>取消編輯</button>}
        </div>
      </div>

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
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.grade || '-'}</td>
                <td className="p-2">{row.subject || '-'}</td>
                <td className="p-2">{row.schoolYear || '-'}</td>
                <td className="p-2">{row.studentCount || 0}</td>
                <td className="p-2 space-x-2">
                  <button className="text-blue-600" onClick={() => edit(row)}>編輯</button>
                  <button className="text-red-600" onClick={() => remove(row.id)}>刪除</button>
                  <Link className="text-[#8FA895]" href={`/dashboard/classes/${row.id}`}>教材</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
