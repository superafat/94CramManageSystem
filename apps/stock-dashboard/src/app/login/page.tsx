'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  type ErrorResponse = { error?: string };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(isAxiosError<ErrorResponse>(err) ? err.response?.data?.error || '登入失敗' : '登入失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#eef3ef] px-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-white rounded-xl shadow p-6 space-y-4 border border-[#d8e2da]">
        <h1 className="text-2xl font-bold text-[#6f8d75]">登入 94Stock</h1>
        <input className="w-full border rounded px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" type="password" placeholder="密碼" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button disabled={loading} className="w-full bg-[#8FA895] text-white rounded px-4 py-2 hover:bg-[#7a9380] disabled:opacity-60">{loading ? '登入中...' : '登入'}</button>
        <p className="text-sm text-gray-500">還沒有帳號？<a className="text-[#6f8d75]" href="/register">註冊</a></p>
      </form>
    </div>
  );
}
