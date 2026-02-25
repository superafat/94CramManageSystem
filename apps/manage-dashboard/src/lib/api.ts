const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100'

// ===== API Cache & Performance =====

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresIn: number
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private readonly defaultTTL = 60000 // 1 minute

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.expiresIn) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl ?? this.defaultTTL,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): void {
    this.cache.delete(key)
  }
}

export const apiCache = new APICache()

// Request deduplication
const pendingRequests = new Map<string, Promise<unknown>>()

async function dedupedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = pendingRequests.get(key)
  if (pending) return pending as Promise<T>

  const promise = fetcher().finally(() => pendingRequests.delete(key))
  pendingRequests.set(key, promise)
  return promise
}

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
}

export interface TenantStats {
  conversations: number
  knowledgeChunks: number
  branches: number
}

export interface AIQueryResult {
  answer: string
  model: string
  intent: string
  latencyMs: number
}

export interface RAGSource {
  content: string
  score: number
  metadata: Record<string, unknown>
}

// Tenant context stored in localStorage
export function getCurrentTenantId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('tenantId') ?? ''
}

export function setCurrentTenantId(id: string) {
  localStorage.setItem('tenantId', id)
}

export function getCurrentBranchId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('branchId') ?? ''
}

export function setCurrentBranchId(id: string) {
  localStorage.setItem('branchId', id)
}

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': getCurrentTenantId(),
  }
}

// Enhanced fetch with error handling, retry, and caching
interface FetchOptions extends Omit<RequestInit, 'cache'> {
  useCache?: boolean
  cacheTTL?: number
  retry?: number
  retryDelay?: number
}

async function enhancedFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { useCache = false, cacheTTL, retry = 2, retryDelay = 1000, ...fetchOptions } = options
  const cacheKey = `${url}:${JSON.stringify(fetchOptions)}`

  // Check cache
  if (useCache) {
    const cached = apiCache.get<T>(cacheKey)
    if (cached) return cached
  }

  // Deduped fetch with retry
  const fetcher = async (): Promise<T> => {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retry; attempt++) {
      try {
        const res = await fetch(url, { ...fetchOptions, credentials: 'include' })
        
        if (!res.ok) {
          // 401 = token expired or invalid → redirect to login
          if (res.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('user')
            localStorage.removeItem('tenantId')
            localStorage.removeItem('branchId')
            window.location.href = '/login'
            return undefined as never
          }
          const errorText = await res.text().catch(() => res.statusText)
          throw new APIError(
            `HTTP ${res.status}: ${errorText}`,
            res.status,
            url
          )
        }
        
        const data = await res.json()
        
        // Cache on success
        if (useCache) {
          apiCache.set(cacheKey, data, cacheTTL)
        }
        
        return data
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        
        // Don't retry on client errors (4xx)
        if (err instanceof APIError && err.status >= 400 && err.status < 500) {
          break
        }
        
        // Wait before retry
        if (attempt < retry) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }
    
    throw lastError || new Error('Request failed')
  }

  return useCache 
    ? dedupedFetch(cacheKey, fetcher)
    : fetcher()
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public url: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export async function fetchTenants(): Promise<Tenant[]> {
  const data = await enhancedFetch<{ tenants: Tenant[] }>(
    `${API_BASE}/api/admin/tenants`,
    { headers: headers(), useCache: true, cacheTTL: 300000 } // 5 min cache
  )
  return data.tenants ?? []
}

export async function fetchTenantStats(tenantId: string): Promise<TenantStats> {
  return enhancedFetch<TenantStats>(
    `${API_BASE}/api/admin/tenants/${tenantId}/stats`,
    { headers: headers(), useCache: true, cacheTTL: 30000 } // 30s cache
  )
}

export async function aiQuery(query: string, userId = 'dashboard-test'): Promise<AIQueryResult> {
  return enhancedFetch<AIQueryResult>(
    `${API_BASE}/api/bot/ai-query`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query,
        branchId: getCurrentBranchId(),
        userId,
      }),
    }
  )
}

export async function ragSearch(query: string, topK = 5): Promise<{ sources: RAGSource[]; count: number }> {
  return enhancedFetch<{ sources: RAGSource[]; count: number }>(
    `${API_BASE}/api/bot/rag-search`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        query,
        branchId: getCurrentBranchId(),
        topK,
      }),
    }
  )
}

export async function ingestKnowledge(content: string, title?: string): Promise<{ ok: boolean; stored: number }> {
  return enhancedFetch<{ ok: boolean; stored: number }>(
    `${API_BASE}/api/admin/knowledge/ingest`,
    {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        branchId: getCurrentBranchId(),
        chunks: [{ content, metadata: title ? { title } : {} }],
      }),
    }
  )
}

export async function healthCheck(): Promise<{ status: string }> {
  return enhancedFetch<{ status: string }>(
    `${API_BASE}/api/health`,
    { headers: headers(), useCache: true, cacheTTL: 10000 } // 10s cache
  )
}

export interface Student {
  id: string
  name: string
  grade?: string
  subjects?: string[]
  attendance_rate?: number
  average_grade?: number
  status?: 'active' | 'at_risk' | 'inactive'
  risk_level?: 'high' | 'medium' | 'low' | null
  phone?: string
  email?: string
  joined_date?: string
  attendance_history?: Array<{ date: string; rate: number }>
  grade_history?: Array<{ subject: string; score: number; date: string }>
}

export async function fetchStudents(): Promise<Student[]> {
  const data = await enhancedFetch<{ students: Student[] }>(
    `${API_BASE}/api/admin/students`,
    { headers: headers(), useCache: true, cacheTTL: 60000 } // 1 min cache
  )
  const payload = (data && typeof data === 'object' && 'data' in data)
    ? (data as { data: { students: Student[] } }).data
    : data
  return payload.students ?? []
}

// Generic API fetch utility
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': getCurrentTenantId(),
      ...options?.headers,
    },
  })
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.removeItem('tenantId')
      localStorage.removeItem('branchId')
      window.location.href = '/login'
      return undefined as never
    }
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

// ===== Trial Management APIs =====

export interface Trial {
  id: string
  name: string
  slug: string
  plan: string
  active: boolean
  created_at: string
  trial_status: 'none' | 'pending' | 'approved' | 'rejected' | 'expired'
  trial_start_at: string | null
  trial_end_at: string | null
  trial_approved_at: string | null
  trial_notes: string | null
  trial_approved_by: string | null
  approver_name: string | null
}

export interface TrialListResponse {
  trials: Trial[]
}

export async function fetchTrials(): Promise<Trial[]> {
  const data = await apiFetch<TrialListResponse>('/api/admin/trials')
  return data.trials || []
}

export async function approveTrial(tenantId: string, notes?: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/trials/${tenantId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

export async function rejectTrial(tenantId: string, notes: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/trials/${tenantId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}

export async function revokeTrial(tenantId: string, notes?: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/trials/${tenantId}/revoke`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  })
}
