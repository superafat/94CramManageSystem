'use client'

import { useRouter } from 'next/navigation'

interface AdminHeaderProps {
  userName: string | undefined
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
  const router = useRouter()

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '24px' }}>
      <button
        onClick={() => router.push('/main')}
        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        ← 返回首頁
      </button>

      <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <h1 style={{ fontSize: '28px', color: 'var(--primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          ⚙️ 管理員後台
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          歡迎，管理員 {userName}
        </p>
      </div>
    </div>
  )
}
