'use client'

interface StatCardProps {
  emoji: string
  label: string
  value: number
  color: string
}

export default function StatCard({ emoji, label, value, color }: StatCardProps) {
  return (
    <div style={{ background: color, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '24px' }}>{emoji}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '4px' }}>{value}</div>
    </div>
  )
}
