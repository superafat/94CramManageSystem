'use client'

interface Props {
  value: string
  onChange: (value: string) => void
}

export function AdvancedEditor({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">完整 System Prompt</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className="w-full px-4 py-3 border border-border rounded-xl bg-surface text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-y"
        placeholder="在此輸入完整的 system prompt..."
      />
      <p className="text-xs text-text-muted">進階模式：直接編輯完整的 system prompt，將覆蓋結構化設定。</p>
    </div>
  )
}
