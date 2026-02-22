'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ tenantName: '', slug: '', email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/register', form);
      router.push('/login');
    } catch (err: any) {
      setError(err?.response?.data?.error || '註冊失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef3ef] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4 border border-[#d8e2da]">
        <h1 className="text-2xl font-bold text-[#6f8d75]">建立補習班帳號</h1>
        <input className="w-full border rounded px-3 py-2" placeholder="補習班名稱" value={form.tenantName} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder="管理員 Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="密碼" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder="管理員名稱" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-[#8FA895] text-white rounded px-4 py-2 hover:bg-[#7a9380] disabled:opacity-60">{loading ? '註冊中...' : '註冊'}</button>
      </form>
    </div>
  );
}
