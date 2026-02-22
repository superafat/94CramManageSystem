'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

type NotificationType = 'low_stock' | 'purchase_approval' | 'system';

type NotificationSetting = {
  id?: string;
  type: NotificationType;
  telegramChatId?: string;
  telegramBotToken?: string;
  isEnabled: boolean;
};

type NotificationHistory = {
  id: string;
  type: string;
  title: string;
  message: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
};

const typeLabel: Record<NotificationType, string> = {
  low_stock: '低庫存',
  purchase_approval: '進貨審核',
  system: '系統通知',
};

export default function NotificationsPage() {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async () => {
    const [settingsRes, historyRes] = await Promise.all([
      api.get<NotificationSetting[]>('/notifications/settings'),
      api.get<NotificationHistory[]>('/notifications/history'),
    ]);
    setSettings(settingsRes.data);
    setHistory(historyRes.data);
  };

  useEffect(() => {
    load().catch(() => toast.error('載入通知設定失敗'));
  }, []);

  const updateSetting = (type: NotificationType, field: keyof NotificationSetting, value: string | boolean) => {
    setSettings((prev) => prev.map((item) => (item.type === type ? { ...item, [field]: value } : item)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/settings', { settings });
      toast.success('通知設定已更新');
      await load();
    } catch {
      toast.error('更新通知設定失敗');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setSending(true);
    try {
      await api.post('/notifications/test', { title: '測試通知', message: '94Stock 通知測試成功' });
      toast.success('測試通知已送出');
      await load();
    } catch {
      toast.error('測試通知送出失敗');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      <h2 className="text-2xl font-bold text-gray-900">通知設定</h2>

      <div className="bg-white border rounded-lg p-4 space-y-4">
        {settings.map((setting) => (
          <div key={setting.type} className="grid md:grid-cols-4 gap-2 items-center border-b last:border-b-0 pb-3 last:pb-0">
            <div className="font-medium text-gray-700">{typeLabel[setting.type as NotificationType]}</div>
            <input
              className="border rounded px-2 py-2"
              placeholder="Telegram Bot Token"
              value={setting.telegramBotToken || ''}
              onChange={(e) => updateSetting(setting.type, 'telegramBotToken', e.target.value)}
            />
            <input
              className="border rounded px-2 py-2"
              placeholder="Telegram Chat ID"
              value={setting.telegramChatId || ''}
              onChange={(e) => updateSetting(setting.type, 'telegramChatId', e.target.value)}
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={setting.isEnabled}
                onChange={(e) => updateSetting(setting.type, 'isEnabled', e.target.checked)}
              />
              啟用通知
            </label>
          </div>
        ))}

        <div className="flex gap-2">
          <button className="bg-[#8FA895] text-white rounded px-3 py-2 disabled:opacity-50" disabled={saving} onClick={save}>
            {saving ? '儲存中...' : '儲存設定'}
          </button>
          <button className="bg-gray-700 text-white rounded px-3 py-2 disabled:opacity-50" disabled={sending} onClick={sendTest}>
            {sending ? '發送中...' : '發送測試通知'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b font-medium">通知歷史</div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">時間</th>
              <th className="p-2 text-left">類型</th>
              <th className="p-2 text-left">標題</th>
              <th className="p-2 text-left">狀態</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{new Date(row.createdAt).toLocaleString()}</td>
                <td className="p-2">{row.type}</td>
                <td className="p-2">{row.title}</td>
                <td className="p-2">
                  <span className={row.status === 'sent' ? 'text-green-700' : row.status === 'failed' ? 'text-red-700' : 'text-amber-700'}>
                    {row.status}
                  </span>
                  {row.errorMessage ? <div className="text-xs text-red-500">{row.errorMessage}</div> : null}
                </td>
              </tr>
            ))}
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-gray-500">尚無通知紀錄</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
