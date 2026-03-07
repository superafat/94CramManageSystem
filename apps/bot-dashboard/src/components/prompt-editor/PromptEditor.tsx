'use client'

import { useState } from 'react'
import { StructuredForm, type StructuredPrompt } from './StructuredForm'
import { AdvancedEditor } from './AdvancedEditor'

export interface PromptSettings {
  mode: 'structured' | 'advanced'
  structured: StructuredPrompt
  fullPrompt: string
}

interface Props {
  value: PromptSettings
  onChange: (value: PromptSettings) => void
  onSave: () => void
  onReset: () => void
  saving?: boolean
}

export function PromptEditor({ value, onChange, onSave, onReset, saving }: Props) {
  const [showPreview, setShowPreview] = useState(false)

  const composedPrompt = composePrompt(value.structured)

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => onChange({ ...value, mode: 'structured' })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            value.mode === 'structured' ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
          }`}
        >
          結構化模式
        </button>
        <button
          onClick={() => onChange({ ...value, mode: 'advanced' })}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            value.mode === 'advanced' ? 'bg-primary text-white' : 'bg-surface-hover text-text-muted'
          }`}
        >
          進階模式
        </button>
      </div>

      {value.mode === 'structured' ? (
        <StructuredForm
          value={value.structured}
          onChange={(structured) => onChange({ ...value, structured })}
        />
      ) : (
        <AdvancedEditor
          value={value.fullPrompt}
          onChange={(fullPrompt) => onChange({ ...value, fullPrompt })}
        />
      )}

      {value.mode === 'structured' && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-primary hover:underline"
          >
            {showPreview ? '隱藏預覽' : '預覽組合後的完整 Prompt'}
          </button>
          {showPreview && (
            <div className="mt-2 p-4 bg-surface-hover rounded-xl border border-border">
              <pre className="text-sm text-text whitespace-pre-wrap font-mono">{composedPrompt}</pre>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-text-muted hover:text-danger border border-border rounded-xl hover:border-danger transition-all"
        >
          恢復預設
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存變更'}
        </button>
      </div>
    </div>
  )
}

function composePrompt(s: StructuredPrompt): string {
  const parts: string[] = []
  if (s.roleName) parts.push(`你是「${s.roleName}」。`)
  if (s.roleDescription) parts.push(s.roleDescription)
  if (s.toneRules.length) parts.push(`\n語氣規則：\n${s.toneRules.map((r) => `- ${r}`).join('\n')}`)
  if (s.forbiddenActions.length) parts.push(`\n禁止事項：\n${s.forbiddenActions.map((r) => `- ${r}`).join('\n')}`)
  if (s.capabilities.length) parts.push(`\n能力範圍：\n${s.capabilities.map((r) => `- ${r}`).join('\n')}`)
  if (s.knowledgeScope) parts.push(`\n知識範圍：${s.knowledgeScope}`)
  if (s.customRules.length) parts.push(`\n其他規則：\n${s.customRules.map((r) => `- ${r}`).join('\n')}`)
  return parts.join('\n')
}
