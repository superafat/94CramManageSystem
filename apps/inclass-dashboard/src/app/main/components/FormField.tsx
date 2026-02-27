'use client'

interface FormFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}

export default function FormField({ label, value, onChange, placeholder }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 'bold', fontSize: '14px' }}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--border)', fontSize: '14px', outline: 'none' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}
