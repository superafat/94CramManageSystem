'use client'

import { useEffect, useState, useCallback } from 'react'
import { platformFetch } from '@/lib/api'

// ---------- 型別 ----------

interface Setting {
  id: string
  key: string
  value: string
  updated_at: string
}

interface SettingsResponse {
  data: Setting[]
}

interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy' | 'registered' | string
  latencyMs?: number
  error?: string
}

interface HealthResponse {
  data: {
    status: string
    timestamp: string
    services: ServiceHealth[]
  }
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

function LoadingSection() {
  return (
    <div className="rounded-2xl bg-white shadow-sm p-8 flex items-center justify-center">
      <Spinner />
    </div>
  )
}

function ErrorSection({ message, onRetry }: { message: string; onRetry: () => void }) {
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

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function serviceStatusStyle(status: string): { bg: string; text: string; label: string } {
  if (status === 'healthy') return { bg: '#D1FAE5', text: '#059669', label: '正常' }
  if (status === 'unhealthy') return { bg: '#FEE2E2', text: '#DC2626', label: '異常' }
  return { bg: '#E5E7EB', text: '#6B7280', label: '已註冊' }
}

// ---------- 主頁面 ----------

export default function SettingsPage() {
  // 設定列表
  const [settings, setSettings] = useState<Setting[]>([])
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  // 健康狀態
  const [health, setHealth] = useState<HealthResponse['data'] | null>(null)
  const [healthLoading, setHealthLoading] = useState(true)
  const [healthError, setHealthError] = useState<string | null>(null)

  // Modal 狀態
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editTarget, setEditTarget] = useState<Setting | null>(null)
  const [formKey, setFormKey] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // ---------- 載入 ----------

  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)
      setSettingsError(null)
      const res = await platformFetch<SettingsResponse>('/settings/')
      setSettings(res.data)
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  const fetchHealth = useCallback(async () => {
    try {
      setHealthLoading(true)
      setHealthError(null)
      const res = await platformFetch<HealthResponse>('/settings/health')
      setHealth(res.data)
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : '載入失敗')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchHealth()
  }, [fetchSettings, fetchHealth])

  // ---------- 開啟 Modal ----------

  function openCreate() {
    setModalMode('create')
    setEditTarget(null)
    setFormKey('')
    setFormValue('')
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(setting: Setting) {
    setModalMode('edit')
    setEditTarget(setting)
    setFormKey(setting.key)
    setFormValue(setting.value)
    setFormError(null)
    setShowModal(true)
  }

  // ---------- 儲存設定 ----------

  async function handleSave() {
    if (!formKey.trim()) { setFormError('請輸入設定鍵名'); return }
    // 驗證 value 是否為合法 JSON（若以 { 或 [ 開頭）
    const trimmed = formValue.trim()
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        JSON.parse(trimmed)
      } catch {
        setFormError('JSON 格式不正確，請檢查語法')
        return
      }
    }
    try {
      setActionLoading(true)
      setFormError(null)
      await platformFetch('/settings/', {
        method: 'PUT',
        body: JSON.stringify({ key: formKey, value: formValue }),
      })
      setShowModal(false)
      fetchSettings()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '儲存失敗')
    } finally {
      setActionLoading(false)
    }
  }

  // ---------- 渲染 ----------

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">平台設定</h1>

      {/* ===== 設定管理 ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>設定管理</SectionTitle>
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: '#8FA895' }}
          >
            新增設定
          </button>
        </div>

        {settingsLoading ? (
          <LoadingSection />
        ) : settingsError ? (
          <ErrorSection message={settingsError} onRetry={fetchSettings} />
        ) : (
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            {settings.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">尚無設定資料</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500">
                      <th className="px-4 py-3 font-medium w-48">鍵名</th>
                      <th className="px-4 py-3 font-medium">值</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">最後更新</th>
                      <th className="px-4 py-3 font-medium text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settings.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700 font-medium">{s.key}</td>
                        <td className="px-4 py-3 text-gray-600 max-w-sm">
                          <pre className="whitespace-pre-wrap break-all text-xs font-mono bg-gray-50 rounded px-2 py-1 max-h-20 overflow-auto">
                            {s.value}
                          </pre>
                        </td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatDateTime(s.updated_at)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => openEdit(s)}
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

      {/* ===== 服務健康狀態 ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>服務健康狀態</SectionTitle>
          <button
            onClick={fetchHealth}
            disabled={healthLoading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {healthLoading && <Spinner />}
            重新檢查
          </button>
        </div>

        {healthLoading ? (
          <LoadingSection />
        ) : healthError ? (
          <ErrorSection message={healthError} onRetry={fetchHealth} />
        ) : health ? (
          <div className="space-y-3">
            {/* 整體狀態 */}
            <div className="rounded-2xl bg-white shadow-sm px-5 py-4 flex items-center gap-3">
              <span className="text-sm text-gray-500">整體狀態</span>
              {(() => {
                const style = serviceStatusStyle(health.status)
                return (
                  <span
                    className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {style.label}
                  </span>
                )
              })()}
              <span className="ml-auto text-xs text-gray-400">
                {formatDateTime(health.timestamp)}
              </span>
            </div>

            {/* 各服務卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {health.services.map((svc) => {
                const style = serviceStatusStyle(svc.status)
                return (
                  <div key={svc.name} className="rounded-2xl bg-white shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-800 text-sm">{svc.name}</span>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                    </div>
                    {svc.latencyMs !== undefined && (
                      <p className="text-xs text-gray-500">延遲：{svc.latencyMs} 毫秒</p>
                    )}
                    {svc.error && (
                      <p className="text-xs text-red-500 mt-1 truncate" title={svc.error}>
                        {svc.error}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </section>

      {/* ===== 設定 Modal ===== */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={modalMode === 'create' ? '新增設定' : `編輯設定 — ${editTarget?.key ?? ''}`}
      >
        <div className="space-y-3">
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">鍵名 *</label>
            <input
              type="text"
              value={formKey}
              onChange={(e) => setFormKey(e.target.value)}
              disabled={modalMode === 'edit'}
              placeholder="例如：MAINTENANCE_MODE"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#8FA895] disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">值（可輸入純文字或 JSON）</label>
            <textarea
              value={formValue}
              onChange={(e) => setFormValue(e.target.value)}
              rows={8}
              placeholder='例如：true 或 {"key": "value"}'
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#8FA895] resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModal(false)}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: '#8FA895' }}
            >
              {actionLoading ? '儲存中...' : '儲存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
