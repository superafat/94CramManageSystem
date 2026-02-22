'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';

type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

const defaultForm = { name: '', contactName: '', phone: '', email: '', address: '', notes: '' };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);

  const load = async () => {
    const res = await api.get<Supplier[]>('/suppliers');
    setSuppliers(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await api.put(`/suppliers/${editingId}`, form);
    } else {
      await api.post('/suppliers', form);
    }
    setEditingId(null);
    setForm(defaultForm);
    await load();
  };

  const edit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      notes: supplier.notes || '',
    });
  };

  const remove = async (id: string) => {
    await api.delete(`/suppliers/${id}`);
    await load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">供應商管理</h2>
      <div className="bg-white border rounded-lg p-4 grid md:grid-cols-3 gap-2">
        <input className="border rounded px-2 py-2" placeholder="供應商名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-2 py-2" placeholder="聯絡人" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input className="border rounded px-2 py-2" placeholder="電話" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className="border rounded px-2 py-2" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="border rounded px-2 py-2" placeholder="地址" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <input className="border rounded px-2 py-2" placeholder="備註" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <div className="md:col-span-3 flex gap-2">
          <button className="bg-[#8FA895] text-white rounded px-3 py-2" onClick={submit}>{editingId ? '更新供應商' : '新增供應商'}</button>
          {editingId && <button className="bg-gray-200 rounded px-3 py-2" onClick={() => { setEditingId(null); setForm(defaultForm); }}>取消</button>}
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">名稱</th>
              <th className="p-2 text-left">聯絡人</th>
              <th className="p-2 text-left">電話</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.name}</td>
                <td className="p-2">{row.contactName || '-'}</td>
                <td className="p-2">{row.phone || '-'}</td>
                <td className="p-2">{row.email || '-'}</td>
                <td className="p-2 space-x-2">
                  <button className="text-blue-600" onClick={() => edit(row)}>編輯</button>
                  <button className="text-red-600" onClick={() => remove(row.id)}>刪除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
