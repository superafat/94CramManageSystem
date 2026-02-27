/**
 * Centralized localStorage access utilities for auth/tenant context.
 * Provides safe wrappers with SSR guards so these can be called in
 * both client components and server-side contexts without errors.
 */

export type Role = 'super_admin' | 'admin' | 'manager' | 'staff' | 'teacher' | 'parent' | 'student'

export interface User {
  id: string
  name: string
  role: Role
  tenant_id: string
  branch_id?: string
}

// ── Tenant / Branch ─────────────────────────────────────────────────────────

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('tenantId')
}

export function setTenantId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('tenantId', id)
}

export function getBranchId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('branchId')
}

export function setBranchId(id: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('branchId', id)
}

// ── User ─────────────────────────────────────────────────────────────────────

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export function setUser(user: User): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuthContext(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  localStorage.removeItem('tenantId')
  localStorage.removeItem('branchId')
}
