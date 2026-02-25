'use client';

import { useState } from 'react';
import StatCard from '@/components/ui/StatCard';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  adminBotStatus,
  bindingCodes,
  boundUsers,
  moduleToggles,
  type BindingCode,
  type BoundUser,
} from '@/lib/mock-data';

function statusToBadge(status: BindingCode['status']) {
  const map = { pending: 'pending', used: 'success', expired: 'expired' } as const;
  return map[status];
}

function statusLabel(status: BindingCode['status']) {
  const map = { pending: '等待中', used: '已使用', expired: '已過期' };
  return map[status];
}

export default function ClairvoyantPage() {
  const [modules, setModules] = useState(moduleToggles);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [countdown, setCountdown] = useState(300);
  const [unbindTarget, setUnbindTarget] = useState<string | null>(null);

  const handleGenerateCode = () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setGeneratedCode(code);
    setCountdown(300);
    setShowCodeModal(true);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const codeColumns = [
    { key: 'code', label: '綁定碼', render: (row: BindingCode) => <span className="font-mono font-medium">{row.code}</span> },
    { key: 'status', label: '狀態', render: (row: BindingCode) => <Badge variant={statusToBadge(row.status)} label={statusLabel(row.status)} /> },
    { key: 'createdAt', label: '建立時間', hideOnMobile: true },
    { key: 'usedBy', label: '使用者', render: (row: BindingCode) => <span>{row.usedBy ?? '-'}</span> },
  ];

  const userColumns = [
    { key: 'telegramUsername', label: 'Telegram', render: (row: BoundUser) => <span className="font-medium text-[#7B8FA1]">{row.telegramUsername}</span> },
    { key: 'role', label: '角色' },
    { key: 'boundAt', label: '綁定時間', hideOnMobile: true },
    { key: 'lastActiveAt', label: '最後活躍', hideOnMobile: true },
    {
      key: 'action',
      label: '操作',
      render: (row: BoundUser) => (
        <button
          onClick={() => setUnbindTarget(row.telegramUsername)}
          className="text-xs text-[#C4A4A0] hover:text-red-500 transition-colors"
        >
          解除綁定
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4b4355]">🏫 千里眼管理</h1>
        <p className="text-sm text-[#7b7387] mt-1">管理補習班內部 Bot（@cram94_bot）</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={adminBotStatus.enabled ? '🟢' : '🔴'}
          label="Bot 狀態"
          value={adminBotStatus.enabled ? '已啟用' : '未啟用'}
          color="#7B8FA1"
        />
        <StatCard icon="👥" label="綁定人數" value={adminBotStatus.boundUsers} color="#7B8FA1" />
        <StatCard icon="⚡" label="今日操作數" value={adminBotStatus.todayOperations} color="#7B8FA1" />
      </div>

      {/* Binding Code Management */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#4b4355]">綁定碼管理</h2>
          <button
            onClick={handleGenerateCode}
            className="px-4 py-2 text-sm bg-[#7B8FA1] text-white rounded-lg hover:bg-[#6A7E90] transition-colors"
          >
            生成綁定碼
          </button>
        </div>
        <DataTable<BindingCode & Record<string, unknown>>
          columns={codeColumns}
          data={bindingCodes as (BindingCode & Record<string, unknown>)[]}
          emptyMessage="尚無綁定碼紀錄"
          mobileCard={(row, i) => (
            <div key={i} className="bg-[#F5F0F7]/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-[#4b4355]">{row.code}</span>
                <Badge variant={statusToBadge(row.status)} label={statusLabel(row.status)} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#7b7387]">
                <span>{row.createdAt}</span>
                <span>{row.usedBy ?? '-'}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Bound Users */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">已綁定用戶</h2>
        <DataTable<BoundUser & Record<string, unknown>>
          columns={userColumns}
          data={boundUsers as (BoundUser & Record<string, unknown>)[]}
          emptyMessage="尚無綁定用戶"
          mobileCard={(row, i) => (
            <div key={i} className="bg-[#F5F0F7]/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#7B8FA1]">{row.telegramUsername}</span>
                <span className="text-xs text-[#7b7387]">{row.role}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#7b7387]">
                <span>綁定：{row.boundAt}</span>
                <button
                  onClick={() => setUnbindTarget(row.telegramUsername)}
                  className="text-[#C4A4A0] hover:text-red-500 transition-colors"
                >
                  解除綁定
                </button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Module Toggles */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-2">模組開關</h2>
        <p className="text-xs text-[#7b7387] mb-4">控制該租戶啟用哪些 Bot 模組</p>
        <div className="divide-y divide-[#d8d3de]/50">
          <ToggleSwitch
            enabled={modules.manage}
            onToggle={(v) => setModules((p) => ({ ...p, manage: v }))}
            label="94Manage 學員管理"
            description="查詢學員資料、繳費紀錄、成績報表"
          />
          <ToggleSwitch
            enabled={modules.inclass}
            onToggle={(v) => setModules((p) => ({ ...p, inclass: v }))}
            label="94inClass 點名系統"
            description="出席紀錄查詢、點名操作、請假登記"
          />
          <ToggleSwitch
            enabled={modules.stock}
            onToggle={(v) => setModules((p) => ({ ...p, stock: v }))}
            label="94Stock 庫存管理"
            description="庫存查詢、進出貨紀錄、盤點作業"
          />
        </div>
      </div>

      {/* Generate Code Modal */}
      <Modal
        open={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        title="綁定碼已生成"
      >
        <div className="text-center space-y-4">
          <p className="text-3xl font-mono font-bold tracking-[0.3em] text-[#7B8FA1]">
            {generatedCode}
          </p>
          <p className="text-sm text-[#7b7387]">
            請在 Telegram 中使用 <span className="font-mono bg-[#F5F0F7] px-1 rounded">/bind {generatedCode}</span> 完成綁定
          </p>
          <div className={`text-lg font-medium ${countdown <= 60 ? 'text-[#C4A4A0]' : 'text-[#4b4355]'}`}>
            {countdown > 0 ? `剩餘時間 ${formatCountdown(countdown)}` : '綁定碼已過期'}
          </div>
        </div>
      </Modal>

      {/* Unbind Confirmation Modal */}
      <Modal
        open={!!unbindTarget}
        onClose={() => setUnbindTarget(null)}
        title="確認解除綁定"
        confirmLabel="確認解除"
        onConfirm={() => setUnbindTarget(null)}
        danger
      >
        <p>
          確定要解除 <span className="font-medium text-[#4b4355]">{unbindTarget}</span> 的綁定嗎？解除後該用戶將無法使用千里眼 Bot。
        </p>
      </Modal>
    </div>
  );
}
