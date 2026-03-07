'use client'

import { useEffect, useState } from 'react'

type ResponseStyle = 'concise' | 'detailed' | 'socratic'

interface AiTutorSettings {
  active: boolean
  allowed_subjects: string[]
  response_style: ResponseStyle
  daily_quota: number
  restrict_to_knowledge_base: boolean
}

const ALL_SUBJECTS = ['國文', '英文', '數學', '理化', '社會', '其他']

const RESPONSE_STYLES: { value: ResponseStyle; label: string; desc: string }[] = [
  { value: 'concise', label: '簡潔扼要', desc: '直接給出答案與重點' },
  { value: 'detailed', label: '詳細解說', desc: '逐步拆解，說明過程' },
  { value: 'socratic', label: '蘇格拉底式引導', desc: '以問題引導學生自己思考' },
]

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}

export default function AiTutorSettingsPage() {
  const [settings, setSettings] = useState<AiTutorSettings>({
    active: true,
    allowed_subjects: ['國文', '英文', '數學', '理化', '社會', '其他'],
    response_style: 'detailed',
    daily_quota: 20,
    restrict_to_knowledge_base: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    fetch('/api/ai-tutor/settings', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setSettings({
          active: data.active ?? true,
          allowed_subjects: data.allowed_subjects ?? ALL_SUBJECTS,
          response_style: data.response_style ?? 'detailed',
          daily_quota: data.daily_quota ?? 20,
          restrict_to_knowledge_base: data.restrict_to_knowledge_base ?? false,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleSubject = (subject: string) => {
    setSettings(prev => ({
      ...prev,
      allowed_subjects: prev.allowed_subjects.includes(subject)
        ? prev.allowed_subjects.filter(s => s !== subject)
        : [...prev.allowed_subjects, subject],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setIsError(false)
    try {
      const res = await fetch('/api/ai-tutor/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error()
      setMessage('設定已儲存')
    } catch {
      setMessage('儲存失敗，請稍後再試')
      setIsError(true)
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) return <Loading />

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">⚙️</span>
        <div>
          <h1 className="text-2xl font-bold text-text">助教設定</h1>
          <p className="text-sm text-text-muted">神算子 AI 課業助教</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl border ${
            isError
              ? 'bg-danger/10 border-danger/30'
              : 'bg-success/10 border-success/30'
          }`}
        >
          <p className="text-sm text-text">{message}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Allowed Subjects */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-1">開放科目</h2>
          <p className="text-sm text-text-muted mb-4">勾選允許學生詢問的科目</p>
          <div className="flex flex-wrap gap-3">
            {ALL_SUBJECTS.map(subject => (
              <label
                key={subject}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={settings.allowed_subjects.includes(subject)}
                  onChange={() => toggleSubject(subject)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm text-text">{subject}</span>
              </label>
            ))}
          </div>
          {settings.allowed_subjects.length === 0 && (
            <p className="text-xs text-warning mt-2">請至少選擇一個科目</p>
          )}
        </div>

        {/* Response Style */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-1">回應風格</h2>
          <p className="text-sm text-text-muted mb-4">選擇神算子回答問題的方式</p>
          <div className="space-y-3">
            {RESPONSE_STYLES.map(style => (
              <label
                key={style.value}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  settings.response_style === style.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <input
                  type="radio"
                  name="response_style"
                  value={style.value}
                  checked={settings.response_style === style.value}
                  onChange={() =>
                    setSettings(prev => ({ ...prev, response_style: style.value }))
                  }
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-text">{style.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{style.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Daily Quota */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <h2 className="text-lg font-semibold text-text mb-1">每日配額</h2>
          <p className="text-sm text-text-muted mb-4">每位學生每天最多可以詢問的問題數量</p>
          <div className="flex items-center gap-4">
            <input
              type="number"
              min={1}
              max={200}
              value={settings.daily_quota}
              onChange={e =>
                setSettings(prev => ({
                  ...prev,
                  daily_quota: Math.max(1, parseInt(e.target.value) || 1),
                }))
              }
              className="w-28 px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-text-muted">題 / 人 / 天</span>
          </div>
        </div>

        {/* Restrict to Knowledge Base */}
        <div className="bg-surface rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text">限制知識庫範圍</h2>
              <p className="text-sm text-text-muted mt-1">
                開啟後，神算子只回答知識庫內有的題目；關閉則可回答任意課業問題
              </p>
            </div>
            <button
              onClick={() =>
                setSettings(prev => ({
                  ...prev,
                  restrict_to_knowledge_base: !prev.restrict_to_knowledge_base,
                }))
              }
              className={`relative w-14 h-7 rounded-full transition-colors ${
                settings.restrict_to_knowledge_base ? 'bg-success' : 'bg-border'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  settings.restrict_to_knowledge_base ? 'translate-x-7' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || settings.allowed_subjects.length === 0}
            className="px-8 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  )
}
