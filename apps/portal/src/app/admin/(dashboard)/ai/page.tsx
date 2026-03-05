'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface ProvidersResponse {
  data: {
    providers: ProviderInfo[]
    available: string[]
  }
}

interface ProviderInfo {
  name: string
  [key: string]: unknown
}

interface UsageResponse {
  data: {
    stats: Record<string, unknown>
    totalCost: {
      last24Hours: number
      last7Days: number
    }
  }
}

interface Subscription {
  id: string
  name: string
  plan: string
  status: string
  ai_usage: number
  ai_quota: number
  bot_enabled: boolean
}

interface SubscriptionsResponse {
  data: Subscription[]
}

interface EditSubForm {
  plan: string
  aiQuota: string
  botEnabled: boolean
}

// ---------- 常數 ----------

const PLAN_LABELS: Record<string, string> = {
  free: '免費版',
  basic: '基本版',
  pro: '專業版',
  enterprise: '企業版',
}

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  free: { bg: '#E5E7EB', text: '#6B7280' },
  basic: { bg: '#DBEAFE', text: '#2563EB' },
  pro: { bg: '#D1FAE5', text: '#059669' },
  enterprise: { bg: '#FEF3C7', text: '#D97706' },
}

// ---------- 子元件 ----------

function Spinner() {
  return (
    <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-[#8FA895] rounded-full animate-spin" />
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-700 mb-4">{children}</h2>
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function PlanTag({ plan }: { plan: string }) {
  const colors = PLAN_COLORS[plan] ?? PLAN_COLORS.free
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {PLAN_LABELS[plan] ?? plan}
    </span>
  )
}

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 flex items-center justify-center min-h-[120px]">
      <Spinner />
    </div>
  )
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-6 text-center">
      <p className="text-red-500 mb-3 text-sm">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: '#8FA895' }}
      >
        重新載入
      </button>
    </div>
  )
}

// ---------- 主頁面 ----------

export default function AiPage() {
  // 供應商
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [availableProviders, setAvailableProviders] = useState<string[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [providersError, setProvidersError] = useState<string | null>(null)

  // 用量
  const [usage, setUsage] = useState<UsageResponse['data'] | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState<string | null>(null)

  // 訂閱
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [subsLoading, setSubsLoading] = useState(true)
  const [subsError, setSubsError] = useState<string | null>(null)

  // 編輯 Modal
  const [editTarget, setEditTarget] = useState<Subscription | null>(null)
  const [editForm, setEditForm] = useState<EditSubForm>({ plan: '', aiQuota: '', botEnabled: false })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // ---------- 載入 ----------

  const fetchProviders = useCallback(async () => {
    try {
      setProvidersLoading(true)
      setProvidersError(null)
      const res = await platformFetch<ProvidersResponse>('/ai/providers')
      setProviders(res.data.providers)
      setAvailableProviders(res.data.available)
    } catch (err) {
      setProvidersError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setProvidersLoading(false)
    }
  }, [])

  const fetchUsage = useCallback(async () => {
    try {
      setUsageLoading(true)
      setUsageError(null)
      const res = await platformFetch<UsageResponse>('/ai/usage')
      setUsage(res.data)
    } catch (err) {
      setUsageError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setUsageLoading(false)
    }
  }, [])

  const fetchSubscriptions = useCallback(async () => {
    try {
      setSubsLoading(true)
      setSubsError(null)
      const res = await platformFetch<SubscriptionsResponse>('/ai/subscriptions')
      setSubscriptions(res.data)
    } catch (err) {
      setSubsError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setSubsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
    fetchUsage()
    fetchSubscriptions()
  }, [fetchProviders, fetchUsage, fetchSubscriptions])

  // ---------- 編輯訂閱 ----------

  function openEdit(sub: Subscription) {
    setEditTarget(sub)
    setEditForm({ plan: sub.plan, aiQuota: String(sub.ai_quota), botEnabled: sub.bot_enabled })
    setEditError(null)
  }

  async function handleEditSub() {
    if (!editTarget) return
    try {
      setEditLoading(true)
      setEditError(null)
      await platformFetch(`/ai/subscriptions/${editTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          plan: editForm.plan,
          aiQuota: editForm.aiQuota ? Number(editForm.aiQuota) : undefined,
          botEnabled: editForm.botEnabled,
        }),
      })
      setEditTarget(null)
      fetchSubscriptions()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setEditLoading(false)
    }
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">AI 與機器人管理</h1>

      {/* ===== 供應商狀態 ===== */}
      <section>
        <SectionTitle>供應商狀態</SectionTitle>
        {providersLoading ? (
          <LoadingCard />
        ) : providersError ? (
          <ErrorCard message={providersError} onRetry={fetchProviders} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-sm p-6 text-sm text-gray-400">
                尚無供應商資料
              </div>
            ) : (
              providers.map((p) => {
                const isAvailable = availableProviders.includes(p.name)
                return (
                  <div key={p.name} className="rounded-2xl bg-white shadow-sm p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                      style={
                        isAvailable
                          ? { backgroundColor: '#D1FAE5', color: '#059669' }
                          : { backgroundColor: '#FEE2E2', color: '#DC2626' }
                      }
                    >
                      {isAvailable ? '可用' : '不可用'}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        )}
      </section>

      {/* ===== 用量統計 ===== */}
      <section>
        <SectionTitle>用量統計</SectionTitle>
        {usageLoading ? (
          <LoadingCard />
        ) : usageError ? (
          <ErrorCard message={usageError} onRetry={fetchUsage} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white shadow-sm p-5">
              <p className="text-sm text-gray-500 mb-1">近 24 小時總費用</p>
              <p className="text-2xl font-bold" style={{ color: '#C4956A' }}>
                ${usage?.totalCost.last24Hours.toFixed(4) ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl bg-white shadow-sm p-5">
              <p className="text-sm text-gray-500 mb-1">近 7 天總費用</p>
              <p className="text-2xl font-bold" style={{ color: '#6B9BD2' }}>
                ${usage?.totalCost.last7Days.toFixed(4) ?? '—'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ===== 租戶訂閱管理 ===== */}
      <section>
        <SectionTitle>補習班訂閱管理</SectionTitle>
        {subsLoading ? (
          <LoadingCard />
        ) : subsError ? (
          <ErrorCard message={subsError} onRetry={fetchSubscriptions} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">尚無資料</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium">補習班名稱</th>
                      <th className="px-4 py-3 font-medium">方案</th>
                      <th className="px-4 py-3 font-medium">AI 用量 / 配額</th>
                      <th className="px-4 py-3 font-medium">機器人</th>
                      <th className="px-4 py-3 font-medium text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{sub.name}</td>
                        <td className="px-4 py-3"><PlanTag plan={sub.plan} /></td>
                        <td className="px-4 py-3 text-gray-700">
                          <div className="flex items-center gap-2">
                            <span>{sub.ai_usage.toLocaleString()} / {sub.ai_quota.toLocaleString()}</span>
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, sub.ai_quota > 0 ? (sub.ai_usage / sub.ai_quota) * 100 : 0)}%`,
                                  backgroundColor: '#8FA895',
                                }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                            style={
                              sub.bot_enabled
                                ? { backgroundColor: '#D1FAE5', color: '#059669' }
                                : { backgroundColor: '#E5E7EB', color: '#6B7280' }
                            }
                          >
                            {sub.bot_enabled ? '已啟用' : '未啟用'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEdit(sub)}
                            className="px-3 py-1 rounded text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50"
                          >
                            編輯
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ===== 編輯訂閱 Modal ===== */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`編輯訂閱 — ${editTarget?.name ?? ''}`}>
        <div className="space-y-3">
          {editError && <p className="text-sm text-red-500">{editError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">方案</label>
            <select
              value={editForm.plan}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
            >
              <option value="free">免費版</option>
              <option value="basic">基本版</option>
              <option value="pro">專業版</option>
              <option value="enterprise">企業版</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AI 配額（次數）</label>
            <input
              type="number"
              value={editForm.aiQuota}
              onChange={(e) => setEditForm({ ...editForm, aiQuota: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#8FA895]"
              placeholder="0"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="botEnabled"
              checked={editForm.botEnabled}
              onChange={(e) => setEditForm({ ...editForm, botEnabled: e.target.checked })}
              className="w-4 h-4 rounded accent-[#8FA895]"
            />
            <label htmlFor="botEnabled" className="text-sm font-medium text-gray-700">
              啟用機器人
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setEditTarget(null)}
              disabled={editLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleEditSub}
              disabled={editLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#8FA895' }}
            >
              {editLoading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
