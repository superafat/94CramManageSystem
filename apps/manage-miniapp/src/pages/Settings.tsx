import { useState } from 'react';
import { toast } from '../components/Toast';
import { SyncStatus } from '../components/SyncStatus';
import { storage } from '../utils/storage';

const BRANCHES = [
  { id: 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d', name: '補習班本校' },
];

interface SettingsProps {
  onLogout: () => void;
  onBack?: () => void;
}

export default function Settings({ onLogout, onBack }: SettingsProps) {
  const [showAbout, setShowAbout] = useState(false);
  const [notifications, setNotifications] = useState({
    attendance: true,
    billing: true,
    churn_alert: false,
  });

  const handleLogout = async () => {
    if (confirm('確定要登出嗎？')) {
      // Clear offline cache on logout
      await storage.clearAll();

      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch {
        // Ignore logout API errors
      }
      localStorage.removeItem('user');
      toast.success('已登出');
      setTimeout(() => onLogout(), 500);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: '#8fa89a' }}
        >
          ← 返回
        </button>
      )}
      <h2 className="text-lg font-bold" style={{ color: '#4a5568' }}>⚙️ 設定</h2>

      {/* Sync Status */}
      <SyncStatus />

      {/* 分校 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <label className="block font-medium mb-2" style={{ color: '#4a5568' }}>📍 所屬分校</label>
        <select 
          className="w-full px-3 py-2 border-2 rounded-lg" 
          style={{ borderColor: 'rgba(143,168,154,0.3)', color: '#1a1a1a', backgroundColor: '#ffffff' }}
          defaultValue={BRANCHES[0].id}
        >
          {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      {/* 通知 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="font-medium" style={{ color: '#4a5568' }}>🔔 通知設定</h3>
        <Toggle 
          label="出席提醒" 
          checked={notifications.attendance} 
          onChange={v => setNotifications(prev => ({ ...prev, attendance: v }))} 
        />
        <Toggle 
          label="帳單提醒" 
          checked={notifications.billing} 
          onChange={v => setNotifications(prev => ({ ...prev, billing: v }))} 
        />
        <Toggle 
          label="流失預警" 
          checked={notifications.churn_alert} 
          onChange={v => setNotifications(prev => ({ ...prev, churn_alert: v }))} 
        />
      </div>

      {/* 關於 */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <button 
          onClick={() => setShowAbout(!showAbout)} 
          className="w-full flex items-center justify-between font-medium" 
          style={{ color: '#4a5568' }}
        >
          <span>ℹ️ 關於補習班</span>
          <span style={{ color: '#8fa89a' }}>{showAbout ? '▲' : '▼'}</span>
        </button>
        {showAbout && (
          <div 
            className="mt-3 pt-3 border-t text-sm space-y-1" 
            style={{ color: '#6b7280', borderColor: 'rgba(155,149,144,0.1)' }}
          >
            <p><strong>版本：</strong>1.2.0</p>
            <p><strong>日期：</strong>2026-02-15</p>
            <p className="text-xs pt-2">© 2026 補習班</p>
          </div>
        )}
      </div>

      {/* 登出 */}
      <button 
        onClick={handleLogout} 
        className="w-full text-white py-3 rounded-lg font-medium shadow-lg" 
        style={{ background: '#c9a9a6' }}
      >
        🚪 登出
      </button>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#4a5568' }}>{label}</span>
      <button 
        onClick={() => onChange(!checked)}
        className="relative w-12 h-6 rounded-full transition-colors"
        style={{ background: checked ? '#8fa89a' : 'rgba(155,149,144,0.2)' }}
      >
        <div 
          className="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"
          style={{ transform: checked ? 'translateX(28px)' : 'translateX(4px)' }} 
        />
      </button>
    </div>
  );
}
