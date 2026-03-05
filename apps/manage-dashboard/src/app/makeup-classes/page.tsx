'use client'

export default function MakeupClassesRedirect() {
  const inclassUrl = process.env.NEXT_PUBLIC_INCLASS_URL || 'https://cram94-inclass-dashboard-1015149159553.asia-east1.run.app'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: '16px',
      padding: '24px',
    }}>
      <div style={{ fontSize: '48px' }}>🔄</div>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#555' }}>
        此功能已遷移至 94inClass
      </h2>
      <p style={{ color: '#888', textAlign: 'center', maxWidth: '400px' }}>
        補課管理已移至課堂教學中心，提供更專注的教學管理體驗。
      </p>
      <a
        href={inclassUrl + '/makeup-classes'}
        style={{
          padding: '12px 32px',
          backgroundColor: '#8FA895',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 500,
          transition: 'background-color 0.2s',
        }}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#7a9380')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#8FA895')}
      >
        前往 94inClass
      </a>
    </div>
  )
}
