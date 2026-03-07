'use client'

import { Slider } from '../ui/Slider'

export interface ModelSettings {
  name: string
  temperature: number
  maxOutputTokens: number
  topP: number
  topK: number
}

interface Props {
  value: ModelSettings
  onChange: (value: ModelSettings) => void
}

const MODELS = [
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (快速)', cost: '~NT$0.1/次' },
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (均衡)', cost: '~NT$0.3/次' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (高品質)', cost: '~NT$1.0/次' },
]

export function ModelConfig({ value, onChange }: Props) {
  const update = (key: keyof ModelSettings, val: unknown) => {
    onChange({ ...value, [key]: val })
  }

  const selectedModel = MODELS.find((m) => m.value === value.name)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium text-text">AI 模型</label>
        <select
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
          className="w-full px-4 py-2 border border-border rounded-xl bg-surface text-text text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        {selectedModel && (
          <p className="text-xs text-text-muted">預估成本：{selectedModel.cost}</p>
        )}
      </div>

      <Slider label="Temperature" value={value.temperature} min={0} max={2} step={0.1} onChange={(v) => update('temperature', v)} description="創意度：低值更精確，高值更有創意" />
      <Slider label="Max Output Tokens" value={value.maxOutputTokens} min={256} max={8192} step={256} onChange={(v) => update('maxOutputTokens', v)} description="回覆最大長度" />
      <Slider label="Top P" value={value.topP} min={0} max={1} step={0.05} onChange={(v) => update('topP', v)} description="詞彙選擇範圍" />
      <Slider label="Top K" value={value.topK} min={1} max={100} step={1} onChange={(v) => update('topK', v)} description="候選詞數量" />
    </div>
  )
}
