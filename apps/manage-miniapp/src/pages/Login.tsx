import { useEffect, useState } from 'react';
import { API_BASE } from '../App';
import type { User } from '../types';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface LoginProps {
  onLogin: () => void;
}

/**
 * 從 JWT token 解析 user 資訊（fallback）
 */
function parseJwt(token: string): User | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.sub || payload.userId || payload.id,
      name: payload.name || payload.username || 'User',
      role: payload.role || 'student',
      tenantId: payload.tenantId || payload.tenant_id || 'default',
      branchId: payload.branchId || payload.branch_id,
    };
  } catch {
    return null;
  }
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      const user = tg.initDataUnsafe?.user;
      if (user) {
        autoLoginWithTelegram(user);
        return;
      }
    }
    setLoading(false);
  }, []);

  const autoLoginWithTelegram = async (user: TelegramUser) => {
    try {
      const response = await fetch(`${API_BASE}/auth/telegram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
        }),
      });
      if (!response.ok) throw new Error('Telegram 登入失敗');
      const data = await response.json();
      const userData = data.user || parseJwt(data.token);
      
      // 檢查角色：只有管理角色可進入
      const adminRoles = ['superadmin', 'admin', 'staff', 'teacher'];
      if (userData && !adminRoles.includes(userData.role)) {
        setError('此管理工具僅供行政人員與教師使用。家長/學生請使用 LINE。');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('token', data.token);
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }

      setTimeout(() => onLogin(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('帳號或密碼錯誤');
      const data = await response.json();
      const userData = data.user || parseJwt(data.token);
      
      // 檢查角色：只有管理角色可進入
      const adminRoles = ['superadmin', 'admin', 'staff', 'teacher'];
      if (userData && !adminRoles.includes(userData.role)) {
        setError('此管理工具僅供行政人員與教師使用。家長/學生請使用 LINE。');
        setSubmitting(false);
        return;
      }
      
      localStorage.setItem('token', data.token);
      if (userData) {
        localStorage.setItem('user', JSON.stringify(userData));
      }

      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
        <div className="text-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'var(--sage)' }}>
            <span className="text-4xl">📚</span>
          </div>
          <p style={{ color: 'var(--stone)' }}>載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--cream)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'var(--sage)' }}>
            <span className="text-5xl">📚</span>
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--stone)' }}>補習班管理</h1>
          <p style={{ color: 'var(--rose)' }}>行政 · 教師 管理工具</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(201,169,166,0.2)', color: 'var(--rose)', border: '1px solid var(--rose)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleManualLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--stone)' }}>帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors"
              style={{ borderColor: 'rgba(143,168,154,0.3)', color: '#1a1a1a', backgroundColor: '#ffffff' }}
              placeholder="請輸入帳號"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--stone)' }}>密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors"
              style={{ borderColor: 'rgba(143,168,154,0.3)', color: '#1a1a1a', backgroundColor: '#ffffff' }}
              placeholder="請輸入密碼"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white py-3 rounded-lg font-medium transition-all disabled:opacity-50 shadow-lg"
            style={{ background: 'var(--sage)' }}
          >
            {submitting ? '登入中...' : '登入'}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(155,149,144,0.6)' }}>
          補習班管理端 v1.1.0 · 家長/學生請使用 LINE
        </p>
      </div>
    </div>
  );
}
