'use client';

import { useState } from 'react';
import ToggleSwitch from '@/components/ui/ToggleSwitch';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import {
  currentPlan,
  plans,
  webhookSettings,
  notificationPreferences,
  type PlanTier,
} from '@/lib/mock-data';

const tierLabel: Record<PlanTier, string> = {
  free: '免費體驗',
  basic: '基礎方案',
  pro: '專業方案',
  enterprise: '企業方案',
};

export default function SettingsPage() {
  const [webhook, setWebhook] = useState(webhookSettings);
  const [notifPrefs, setNotifPrefs] = useState(notificationPreferences);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const confirmName = '大衛文理補習班';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4b4355]">⚙️ 設定</h1>
        <p className="text-sm text-[#7b7387] mt-1">管理訂閱方案、Webhook 與通知偏好</p>
      </div>

      {/* Current Plan */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#4b4355]">目前方案</h2>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="active" label={tierLabel[currentPlan]} />
              <span className="text-sm text-[#7b7387]">
                {plans.find((p) => p.tier === currentPlan)?.price}
              </span>
            </div>
          </div>
          <button className="px-4 py-2 text-sm bg-[#A89BB5] text-white rounded-lg hover:bg-[#9688A3] transition-colors whitespace-nowrap self-start sm:self-center">
            升級方案
          </button>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">方案比較</h2>

        {/* Desktop: table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d8d3de]">
                <th className="text-left py-3 px-3 font-medium text-[#7b7387]">功能</th>
                {plans.map((plan) => (
                  <th
                    key={plan.tier}
                    className={`text-center py-3 px-3 font-medium ${
                      plan.tier === currentPlan ? 'text-[#A89BB5]' : 'text-[#4b4355]'
                    }`}
                  >
                    <div>{plan.name}</div>
                    <div className="text-xs font-normal text-[#7b7387] mt-0.5">{plan.price}</div>
                    {plan.tier === currentPlan && (
                      <div className="text-xs text-[#A89BB5] mt-1">目前方案</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Collect all unique features */}
              {Array.from(new Set(plans.flatMap((p) => p.features))).map((feature) => (
                <tr key={feature} className="border-b border-[#d8d3de]/50">
                  <td className="py-2.5 px-3 text-[#5d5468]">{feature}</td>
                  {plans.map((plan) => (
                    <td key={plan.tier} className="py-2.5 px-3 text-center">
                      {plan.features.includes(feature) ? (
                        <span className="text-[#A8B5A2]">✓</span>
                      ) : (
                        <span className="text-[#d8d3de]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile: cards */}
        <div className="lg:hidden space-y-4">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`rounded-lg border p-4 ${
                plan.tier === currentPlan
                  ? 'border-[#A89BB5] ring-2 ring-[#A89BB5]/20 bg-[#A89BB5]/5'
                  : 'border-[#d8d3de]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-[#4b4355]">{plan.name}</h3>
                <span className="text-sm text-[#7b7387]">{plan.price}</span>
              </div>
              {plan.tier === currentPlan && (
                <Badge variant="active" label="目前方案" />
              )}
              <ul className="mt-3 space-y-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-[#5d5468] flex items-start gap-1.5">
                    <span className="text-[#A8B5A2] mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">Webhook 設定</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#4b4355] block mb-1.5">Webhook URL</label>
            <input
              type="url"
              value={webhook.url}
              onChange={(e) => setWebhook((p) => ({ ...p, url: e.target.value }))}
              placeholder="https://your-server.com/webhook"
              className="w-full px-3 py-2 text-sm border border-[#d8d3de] rounded-lg bg-[#F5F0F7]/50 focus:ring-2 focus:ring-[#A89BB5]/40 focus:border-[#A89BB5] outline-none text-[#4b4355] placeholder:text-[#7b7387]/60"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[#4b4355] mb-3">觸發事件</p>
            <div className="space-y-0 divide-y divide-[#d8d3de]/50">
              <ToggleSwitch
                enabled={webhook.events.operationComplete}
                onToggle={(v) =>
                  setWebhook((p) => ({
                    ...p,
                    events: { ...p.events, operationComplete: v },
                  }))
                }
                label="操作完成"
                description="每次 Bot 完成操作時發送通知"
              />
              <ToggleSwitch
                enabled={webhook.events.dailySummary}
                onToggle={(v) =>
                  setWebhook((p) => ({
                    ...p,
                    events: { ...p.events, dailySummary: v },
                  }))
                }
                label="每日摘要"
                description="每天晚上 10 點發送當日操作摘要"
              />
              <ToggleSwitch
                enabled={webhook.events.anomalyAlert}
                onToggle={(v) =>
                  setWebhook((p) => ({
                    ...p,
                    events: { ...p.events, anomalyAlert: v },
                  }))
                }
                label="異常警報"
                description="偵測到異常操作或錯誤率過高時發送警報"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-2">通知偏好</h2>
        <p className="text-xs text-[#7b7387] mb-4">選擇接收系統通知的管道</p>
        <div className="divide-y divide-[#d8d3de]/50">
          <ToggleSwitch
            enabled={notifPrefs.email}
            onToggle={(v) => setNotifPrefs((p) => ({ ...p, email: v }))}
            label="Email 通知"
            description="系統更新、帳單提醒、安全通知"
          />
          <ToggleSwitch
            enabled={notifPrefs.telegram}
            onToggle={(v) => setNotifPrefs((p) => ({ ...p, telegram: v }))}
            label="Telegram 通知"
            description="即時推送至管理員的 Telegram"
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl border border-red-200 p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-red-500 mb-2">危險區域</h2>
        <p className="text-xs text-[#7b7387] mb-4">以下操作不可復原，請謹慎操作</p>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-red-100">
            <div>
              <p className="text-sm font-medium text-[#4b4355]">重置所有綁定</p>
              <p className="text-xs text-[#7b7387] mt-0.5">解除所有千里眼和順風耳的用戶綁定</p>
            </div>
            <button
              onClick={() => setShowResetModal(true)}
              className="px-4 py-2 text-sm border border-red-300 text-red-500 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap self-start sm:self-center"
            >
              重置所有綁定
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium text-[#4b4355]">刪除帳號</p>
              <p className="text-xs text-[#7b7387] mt-0.5">永久刪除此補習班的所有資料與設定</p>
            </div>
            <button
              onClick={() => {
                setDeleteConfirmText('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2 text-sm bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors whitespace-nowrap self-start sm:self-center"
            >
              刪除帳號
            </button>
          </div>
        </div>
      </div>

      {/* Reset Modal */}
      <Modal
        open={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="確認重置所有綁定"
        confirmLabel="確認重置"
        onConfirm={() => setShowResetModal(false)}
        danger
      >
        <p>此操作將解除所有千里眼和順風耳的用戶綁定，包括：</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-[#5d5468]">
          <li>8 位千里眼綁定用戶</li>
          <li>23 位順風耳綁定家長</li>
        </ul>
        <p className="mt-3 font-medium text-red-500">此操作不可復原！</p>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="確認刪除帳號"
        confirmLabel={deleteConfirmText === confirmName ? '永久刪除' : undefined}
        onConfirm={deleteConfirmText === confirmName ? () => setShowDeleteModal(false) : undefined}
        danger
      >
        <div className="space-y-3">
          <p>此操作將永久刪除「{confirmName}」的所有資料，包括所有綁定、操作紀錄和設定。</p>
          <p className="font-medium text-red-500">此操作不可復原！</p>
          <div>
            <label className="text-xs text-[#7b7387] block mb-1.5">
              請輸入「{confirmName}」以確認刪除：
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={confirmName}
              className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-red-50/30 focus:ring-2 focus:ring-red-300/40 focus:border-red-300 outline-none text-[#4b4355]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
