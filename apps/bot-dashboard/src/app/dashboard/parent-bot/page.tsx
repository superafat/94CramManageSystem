'use client';

import { useState } from 'react';
import StatCard from '@/components/ui/StatCard';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Badge from '@/components/ui/Badge';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import {
  parentBotStatus,
  invitationCodes,
  boundParents,
  parentNotificationSettings,
  studentList,
  currentPlan,
  type InvitationCode,
  type BoundParent,
} from '@/lib/mock-data';

function statusToBadge(status: InvitationCode['status']) {
  const map = { pending: 'pending', used: 'success', expired: 'expired' } as const;
  return map[status];
}

function statusLabel(status: InvitationCode['status']) {
  const map = { pending: '等待中', used: '已使用', expired: '已過期' };
  return map[status];
}

export default function ParentBotPage() {
  const [notifications, setNotifications] = useState(parentNotificationSettings);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState('');
  const [unbindTarget, setUnbindTarget] = useState<string | null>(null);

  const isFreePlan = currentPlan === 'free';

  const handleGenerateInvite = () => {
    if (!selectedStudent) return;
    const code = `P-${String(Math.floor(10000 + Math.random() * 90000))}`;
    setGeneratedInviteCode(code);
  };

  const inviteColumns = [
    { key: 'code', label: '邀請碼', render: (row: InvitationCode) => <span className="font-mono font-medium">{row.code}</span> },
    { key: 'studentName', label: '綁定學生' },
    { key: 'status', label: '狀態', render: (row: InvitationCode) => <Badge variant={statusToBadge(row.status)} label={statusLabel(row.status)} /> },
    { key: 'createdAt', label: '建立時間', hideOnMobile: true },
  ];

  const parentColumns = [
    { key: 'telegramUsername', label: 'Telegram', render: (row: BoundParent) => <span className="font-medium text-[#C4A9A1]">{row.telegramUsername}</span> },
    { key: 'studentName', label: '綁定學生' },
    { key: 'boundAt', label: '綁定時間', hideOnMobile: true },
    {
      key: 'action',
      label: '操作',
      render: (row: BoundParent) => (
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
        <h1 className="text-2xl font-bold text-[#4b4355]">👨‍👩‍👧 順風耳管理</h1>
        <p className="text-sm text-[#7b7387] mt-1">管理家長服務 Bot（@Cram94_VIP_bot）</p>
      </div>

      {/* Free Plan Banner */}
      {isFreePlan && (
        <div className="bg-[#C8BFA9]/15 border border-[#C8BFA9]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-lg">⚡</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[#4b4355]">升級方案以啟用順風耳 Bot</p>
            <p className="text-xs text-[#7b7387] mt-0.5">順風耳 Bot 需要專業方案以上才能使用</p>
          </div>
          <a
            href="/dashboard/settings"
            className="px-4 py-2 text-sm bg-[#A89BB5] text-white rounded-lg hover:bg-[#9688A3] transition-colors whitespace-nowrap"
          >
            查看方案
          </a>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={parentBotStatus.enabled ? '🟢' : '🔴'}
          label="Bot 狀態"
          value={parentBotStatus.enabled ? '已啟用' : '未啟用'}
          color="#C4A9A1"
        />
        <StatCard icon="📨" label="已邀請家長" value={parentBotStatus.invitedParents} color="#C4A9A1" />
        <StatCard icon="🤝" label="已綁定家長" value={parentBotStatus.boundParents} color="#C4A9A1" />
      </div>

      {/* Invitation Code Management */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#4b4355]">家長邀請碼管理</h2>
          <button
            onClick={() => {
              setSelectedStudent('');
              setGeneratedInviteCode('');
              setShowInviteModal(true);
            }}
            className="px-4 py-2 text-sm bg-[#C4A9A1] text-white rounded-lg hover:bg-[#B39891] transition-colors"
          >
            生成邀請碼
          </button>
        </div>
        <DataTable<InvitationCode & Record<string, unknown>>
          columns={inviteColumns}
          data={invitationCodes as (InvitationCode & Record<string, unknown>)[]}
          emptyMessage="尚無邀請碼紀錄"
          mobileCard={(row, i) => (
            <div key={i} className="bg-[#F5F0F7]/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium text-[#4b4355]">{row.code}</span>
                <Badge variant={statusToBadge(row.status)} label={statusLabel(row.status)} />
              </div>
              <div className="flex items-center justify-between text-xs text-[#7b7387]">
                <span>學生：{row.studentName}</span>
                <span>{row.createdAt}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* Bound Parents */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">已綁定家長</h2>
        <DataTable<BoundParent & Record<string, unknown>>
          columns={parentColumns}
          data={boundParents as (BoundParent & Record<string, unknown>)[]}
          emptyMessage="尚無綁定家長"
          mobileCard={(row, i) => (
            <div key={i} className="bg-[#F5F0F7]/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#C4A9A1]">{row.telegramUsername}</span>
                <span className="text-xs text-[#7b7387]">{row.studentName}</span>
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

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-2">通知設定</h2>
        <p className="text-xs text-[#7b7387] mb-4">控制家長收到的通知類型</p>
        <div className="divide-y divide-[#d8d3de]/50">
          <ToggleSwitch
            enabled={notifications.arrival}
            onToggle={(v) => setNotifications((p) => ({ ...p, arrival: v }))}
            label="到校通知"
            description="學生刷卡到校時，自動通知家長"
          />
          <ToggleSwitch
            enabled={notifications.departure}
            onToggle={(v) => setNotifications((p) => ({ ...p, departure: v }))}
            label="離校通知"
            description="學生刷卡離校時，自動通知家長"
          />
          <ToggleSwitch
            enabled={notifications.gradeUpdate}
            onToggle={(v) => setNotifications((p) => ({ ...p, gradeUpdate: v }))}
            label="成績更新通知"
            description="老師更新成績時，自動通知家長查看"
          />
          <ToggleSwitch
            enabled={notifications.paymentReminder}
            onToggle={(v) => setNotifications((p) => ({ ...p, paymentReminder: v }))}
            label="繳費提醒"
            description="繳費期限前 7 天自動提醒家長"
          />
        </div>
      </div>

      {/* Generate Invite Code Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="生成家長邀請碼"
        confirmLabel={generatedInviteCode ? undefined : '生成邀請碼'}
        onConfirm={generatedInviteCode ? undefined : handleGenerateInvite}
      >
        {!generatedInviteCode ? (
          <div className="space-y-3">
            <p>請選擇要綁定的學生：</p>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#d8d3de] rounded-lg bg-[#F5F0F7]/50 focus:ring-2 focus:ring-[#A89BB5]/40 focus:border-[#A89BB5] outline-none text-[#4b4355]"
            >
              <option value="">選擇學生...</option>
              {studentList.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-2xl font-mono font-bold tracking-wider text-[#C4A9A1]">
              {generatedInviteCode}
            </p>
            <p className="text-sm text-[#7b7387]">
              請將此邀請碼提供給 <span className="font-medium text-[#4b4355]">{selectedStudent}</span> 的家長
            </p>
            <p className="text-xs text-[#7b7387]">
              家長在 Telegram 中使用 <span className="font-mono bg-[#F5F0F7] px-1 rounded">/invite {generatedInviteCode}</span> 完成綁定
            </p>
          </div>
        )}
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
          確定要解除 <span className="font-medium text-[#4b4355]">{unbindTarget}</span> 的綁定嗎？解除後該家長將無法收到通知。
        </p>
      </Modal>
    </div>
  );
}
