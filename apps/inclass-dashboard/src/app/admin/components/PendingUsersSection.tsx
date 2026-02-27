'use client'

interface User {
  id: string
  email: string
  name: string
  role: string
  status: string
  createdAt: string
}

interface PendingUsersSectionProps {
  users: User[]
  onApprove: (userId: string) => void
  onReject: (userId: string) => void
}

export default function PendingUsersSection({ users, onApprove, onReject }: PendingUsersSectionProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📋 待審核用戶 ({users.length})
        </h2>

        {users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <p>目前沒有待審核的用戶</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {users.map((user) => (
              <div
                key={user.id}
                style={{
                  padding: '16px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{user.name}</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{user.email}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    角色：{user.role} · 狀態：{user.status}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onApprove(user.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#22C55E',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✅ 核准
                  </button>
                  <button
                    onClick={() => onReject(user.id)}
                    style={{
                      padding: '8px 16px',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ❌ 拒絕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
