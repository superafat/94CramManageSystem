'use client'

export default function KnowledgePage() {
  return (
    <div style={{ maxWidth: 600, margin: '80px auto', textAlign: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
        知識庫管理已移至總後台
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
        知識庫管理功能已整合至 94Portal 總後台統一管理。
      </p>
      <a
        href="https://94cram.com"
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
        前往總後台
      </a>
    </div>
  )
}
