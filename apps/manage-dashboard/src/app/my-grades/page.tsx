'use client'

const INCLASS_URL = 'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app'

export default function MyGradesPage() {
  return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
        學生功能已移至 94inClass
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        我的課表、成績查詢等學生功能，已整合至蜂神榜 Ai 點名系統 (94inClass)。
      </p>
      <a
        href={INCLASS_URL}
        style={{
          display: 'inline-block',
          padding: '10px 24px',
          background: 'var(--primary)',
          color: '#fff',
          borderRadius: 12,
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        前往 94inClass
      </a>
    </div>
  )
}
