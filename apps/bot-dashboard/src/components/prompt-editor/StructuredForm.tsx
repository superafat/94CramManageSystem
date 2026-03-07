'use client'

import { TagInput } from '../ui/TagInput'

export interface StructuredPrompt {
  roleName: string
  roleDescription: string
  toneRules: string[]
  forbiddenActions: string[]
  capabilities: string[]
  knowledgeScope: string
  customRules: string[]
}

interface Props {
  value: StructuredPrompt
  onChange: (value: StructuredPrompt) => void
}

export function StructuredForm({ value, onChange }: Props) {
  const update = (key: keyof StructuredPrompt, val: unknown) => {
    onChange({ ...value, [key]: val })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">角色名稱</label>
        <input
          type="text"
          value={value.roleName}
          onChange={(e) => update('roleName', e.target.value)}
          placeholder="例：千里眼"
          className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-text">角色描述</label>
        <textarea
          value={value.roleDescription}
          onChange={(e) => update('roleDescription', e.target.value)}
          rows={3}
          placeholder="描述這個 Bot 的角色定位..."
          className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <TagInput label="語氣規則" tags={value.toneRules} onChange={(v) => update('toneRules', v)} placeholder="例：回覆簡短自然，1-3句" />
      <TagInput label="禁止事項" tags={value.forbiddenActions} onChange={(v) => update('forbiddenActions', v)} placeholder="例：不說「作為AI」" />
      <TagInput label="能力範圍" tags={value.capabilities} onChange={(v) => update('capabilities', v)} placeholder="例：查詢出勤紀錄" />

      <div className="space-y-2">
        <label className="text-sm font-medium text-text">知識範圍</label>
        <textarea
          value={value.knowledgeScope}
          onChange={(e) => update('knowledgeScope', e.target.value)}
          rows={2}
          placeholder="描述這個 Bot 的知識範圍..."
          className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <TagInput label="自訂規則" tags={value.customRules} onChange={(v) => update('customRules', v)} placeholder="其他自訂規則" />
    </div>
  )
}
