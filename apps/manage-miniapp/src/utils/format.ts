/**
 * Formatting utility functions
 */

// Format number as currency (NT$)
export function formatCurrency(n: number): string {
  return `NT$ ${n.toLocaleString()}`
}

// Format number as percentage
export function formatPercent(n: number): string {
  return `${Math.round(n)}%`
}

// Format date as YYYY-MM-DD
export function formatDate(d: Date | string): string {
  if (typeof d === 'string') {
    d = new Date(d)
  }
  return d.toISOString().split('T')[0]
}

// Format grade string (standardize grade display)
export function formatGrade(grade: string): string {
  return grade.trim()
}
