/**
 * Application constants
 */

// API Configuration
export const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3100/api' : '/api')
export const TENANT_ID = '11111111-1111-1111-1111-111111111111'
export const BRANCH_ID = 'a1b2c3d4-e5f6-1a2b-8c3d-4e5f6a7b8c9d'

// API Headers
export const apiHeaders = (): Record<string, string> => ({
  'Content-Type': 'application/json',
  'X-Tenant-Id': TENANT_ID,
})

// Color constants for charts and UI
export const COLORS = {
  sage: '#8fa89a',
  rose: '#c9a9a6',
  blue: '#94a7b8',
  sand: '#c4b5a0',
  mauve: '#b8a5c4',
  cream: '#f5f0eb',
  stone: '#9b9590',
}
