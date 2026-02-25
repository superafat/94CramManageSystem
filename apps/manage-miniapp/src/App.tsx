import { useState, useEffect, lazy, Suspense } from 'react'
import Dashboard from './pages/Dashboard'
import Schedule from './pages/Schedule'
import Students from './pages/Students'
import Alerts from './pages/Alerts'
import Login from './pages/Login'
import Settings from './pages/Settings'
import AiChat from './components/AiChat'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { OfflineIndicator } from './components/OfflineIndicator'
import { InstallPrompt } from './components/InstallPrompt'
import { API_BASE, TENANT_ID, BRANCH_ID, apiHeaders } from './utils/constants'
import { getUser, getUserRole, getRoleDisplayName, getRoleColor, isGuest, type UserRole } from './utils/auth'

const Reports = lazy(() => import('./pages/Reports'))

export { API_BASE, TENANT_ID, BRANCH_ID, apiHeaders }

type Tab = 'dashboard' | 'schedule' | 'students' | 'alerts' | 'reports' | 'settings'

const allTabs: { id: Tab; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '📊', label: '總覽' },
  { id: 'schedule', icon: '📅', label: '課表' },
  { id: 'students', icon: '👥', label: '學生' },
  { id: 'reports', icon: '📈', label: '報表' },
  { id: 'alerts', icon: '🔔', label: '通知' },
]

// 管理角色才能用 Mini App（家長/學生走 LINE）
const ADMIN_ROLES: UserRole[] = ['superadmin', 'admin', 'staff', 'teacher']

const ROLE_TABS: Record<string, Tab[]> = {
  superadmin: ['dashboard', 'schedule', 'students', 'reports', 'alerts'],
  admin: ['dashboard', 'schedule', 'students', 'reports', 'alerts'],
  staff: ['dashboard', 'schedule', 'students', 'alerts'],
  teacher: ['dashboard', 'schedule', 'students', 'alerts'],
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [tgUser, setTgUser] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('user'))

  const user = getUser()
  const userRole = getUserRole()
  const roleDisplayName = getRoleDisplayName(userRole)
  const roleColor = getRoleColor(userRole)

  // Guest 或非管理角色 → 強制登出回登入頁
  const isAdminRole = ADMIN_ROLES.includes(userRole)
  const guest = isGuest()

  const visibleTabIds = ROLE_TABS[userRole] || ROLE_TABS['admin']
  const tabs = allTabs.filter(tab => visibleTabIds.includes(tab.id))

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#8fa89a')
      tg.setBackgroundColor('#f5f0eb')
      setTgUser(tg.initDataUnsafe?.user?.first_name ?? null)
    }
  }, [])

  // 未登入 → 登入頁
  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />
  }

  // 登入了但不是管理角色 → 顯示無權限畫面
  if (guest || !isAdminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--cream)' }}>
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#4a5568' }}>
            僅限管理人員
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--stone)' }}>
            此管理工具僅供行政人員與教師使用。
            {'\n'}家長與學生請使用 LINE 官方帳號查詢資料。
          </p>
          <button
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
              } catch {
                // Ignore logout API errors
              }
              localStorage.removeItem('user');
              setIsLoggedIn(false)
            }}
            className="px-6 py-3 rounded-xl font-medium text-white"
            style={{ background: 'var(--sage)' }}
          >
            切換帳號
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--cream)' }}>
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Install Prompt */}
      <InstallPrompt />
      
      {/* Header */}
      <header className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: '#4a5568' }}>
              🐝 補習班管理
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm" style={{ color: 'var(--stone)' }}>
                {user?.name || tgUser || '管理系統'}
              </p>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${roleColor}22`,
                  color: roleColor,
                  border: `1px solid ${roleColor}`
                }}
              >
                {roleDisplayName}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: activeTab === 'settings' ? 'var(--rose)' : 'var(--sage)', color: 'white' }}
          >
            {activeTab === 'settings' ? '⚙️' : (tgUser ? tgUser[0] : user?.name?.[0] || '🐝')}
          </button>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-4">
        {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
        {activeTab === 'schedule' && <Schedule />}
        {activeTab === 'students' && <Students />}
        {activeTab === 'alerts' && <Alerts />}
        {activeTab === 'reports' && (
          <Suspense fallback={<LoadingSkeleton type="card" count={3} />}>
            <Reports />
          </Suspense>
        )}
        {activeTab === 'settings' && <Settings onLogout={() => setIsLoggedIn(false)} onBack={() => setActiveTab('dashboard')} />}
      </main>

      {/* AI Chat FAB */}
      <button
        onClick={() => setShowChat(true)}
        className="fixed right-4 bottom-24 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg z-40 active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, var(--sage), var(--blue))' }}
      >
        🤖
      </button>

      {showChat && <AiChat onClose={() => setShowChat(false)} />}

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-2 px-4"
           style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
              activeTab === tab.id ? 'scale-105' : 'opacity-60'
            }`}
            style={activeTab === tab.id ? { color: 'var(--sage)' } : {}}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs mt-0.5 font-medium">{tab.label}</span>
            {activeTab === tab.id && (
              <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: 'var(--sage)' }} />
            )}
          </button>
        ))}
      </nav>
    </div>
  )
}
