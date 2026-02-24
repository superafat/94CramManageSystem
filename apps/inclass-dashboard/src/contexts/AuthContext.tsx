'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3102'

interface User {
  id: string
  email: string
  name: string
  role: string
  status?: string
  isDemo?: boolean
}

interface School {
  id: string
  name: string
}

interface AuthContextType {
  token: string | null
  user: User | null
  school: School | null
  login: (email: string, password: string) => Promise<void>
  register: (schoolName: string, email: string, password: string, name: string) => Promise<void>
  demoLogin: () => Promise<void>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Load token from localStorage
    const savedToken = localStorage.getItem('token')
    if (savedToken) {
      setToken(savedToken)
      // Verify token and load user
      fetchMe(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMe = async (authToken: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      if (res.ok) {
        const text = await res.text()
        try {
          const data = JSON.parse(text)
          setUser(data.user)
          setSchool(data.school)
        } catch {
          logout()
          return
        }
      } else {
        // Invalid token
        logout()
      }
    } catch (e) {
      console.error('Failed to fetch user:', e)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`伺服器回應異常 (${res.status})`)
    }
    
    if (!res.ok) {
      // Check for pending status
      if (res.status === 403) {
        throw new Error(data.error || '帳號待審核中，請聯繫管理員')
      }
      throw new Error(data.error || '登入失敗')
    }

    setToken(data.token)
    setUser(data.user)
    setSchool(data.school)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    router.push('/')
  }

  const register = async (schoolName: string, email: string, password: string, name: string) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName, email, password, name })
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`伺服器回應異常 (${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }
    setToken(data.token)
    setUser(data.user)
    setSchool(data.school)
    localStorage.setItem('token', data.token)
    if (data.user) localStorage.setItem('user', JSON.stringify(data.user))
    if (data.school) localStorage.setItem('school', JSON.stringify(data.school))
    router.push('/')
  }

  const demoLogin = async () => {
    const res = await fetch(`${API_BASE}/api/auth/demo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`伺服器回應異常 (${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data.error || 'Demo 登入失敗')
    }

    setToken(data.token)
    setUser(data.user)
    setSchool(data.school)
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    localStorage.setItem('school', JSON.stringify(data.school))
    router.push('/main')
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    setSchool(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('school')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ token, user, school, login, register, demoLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
