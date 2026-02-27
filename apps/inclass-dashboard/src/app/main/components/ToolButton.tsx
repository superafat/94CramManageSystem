'use client'

interface ToolButtonProps {
  emoji: string
  label: string
  onClick: () => void
}

export default function ToolButton({ emoji, label, onClick }: ToolButtonProps) {
  return (
    <button onClick={onClick} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', gap: '4px' }}>
      <div style={{ fontSize: '28px' }}>{emoji}</div>
      <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>{label}</div>
    </button>
  )
}
