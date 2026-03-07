'use client'

interface SliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  description?: string
}

export function Slider({ label, value, min, max, step, onChange, description }: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-text">{label}</label>
        <span className="text-sm text-primary font-mono">{value}</span>
      </div>
      {description && <p className="text-xs text-text-muted">{description}</p>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-xs text-text-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}
