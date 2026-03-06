'use client'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'

function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const publicPaths = ['/login', '/register', '/landing', '/']
    if (!loading && !user && !publicPaths.includes(pathname)) {
      router.push('/login')
    }
  }, [user, loading, pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E8DED0 0%, #D4C4B0 100%)' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#D4A574' }}>
            <span className="text-3xl">🐝</span>
          </div>
          <p style={{ color: '#8B7355' }}>載入中...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  return (
    <GoogleOAuthProvider clientId={clientId || ''}>
      <AuthProvider>
        <RouteGuard>
          {children}
        </RouteGuard>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
