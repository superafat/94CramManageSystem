'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type Settings = {
  apiEndpoint?: string;
  apiKey?: string;
  isEnabled?: boolean;
  lastSyncAt?: string | null;
};

export default function IntegrationsPage() {
  const [settings, setSettings] = useState<Settings>({ apiEndpoint: '', apiKey: '', isEnabled: false });
  const [syncStatus, setSyncStatus] = useState<{ status: string; lastSyncAt: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [settingsRes, statusRes] = await Promise.all([
      api.get('/integrations/settings'),
      api.get('/integrations/sync-status'),
    ]);
    setSettings(settingsRes.data);
    setSyncStatus(statusRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('載入整合設定失敗'));
  }, []);

  const save = async () => {
    setLoading(true);
    try {
      await api.put('/integrations/settings', settings);
      toast.success('整合設定已更新');
      await load();
    } catch {
      toast.error('更新整合設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    setLoading(true);
    try {
      await api.post('/integrations/sync');
      toast.success('同步已啟動');
      await load();
    } catch {
      toast.error('手動同步失敗');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">系統整合</h2>
      <div className="bg-white border rounded p-4 space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="94Manage API Endpoint" value={settings.apiEndpoint || ''} onChange={(e) => setSettings({ ...settings, apiEndpoint: e.target.value })} />
        <input className="w-full border rounded px-3 py-2" placeholder="94Manage API Key" value={settings.apiKey || ''} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })} />
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={Boolean(settings.isEnabled)} onChange={(e) => setSettings({ ...settings, isEnabled: e.target.checked })} />
          啟用整合
        </label>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-[#8FA895] text-white disabled:opacity-50" disabled={loading} onClick={save}>儲存設定</button>
          <button className="px-3 py-2 rounded bg-gray-700 text-white disabled:opacity-50" disabled={loading} onClick={syncNow}>立即同步</button>
        </div>
      </div>
      <div className="bg-white border rounded p-4">
        <p className="text-sm text-gray-700">同步狀態：{syncStatus?.status || 'unknown'}</p>
        <p className="text-sm text-gray-700">最後同步：{syncStatus?.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : '-'}</p>
      </div>
    </div>
  );
}
