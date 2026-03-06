const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** Format a date string as M/D (e.g. "3/15"). Returns original string if invalid. */
export function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getMonth() + 1}/${date.getDate()}`
}

/** Extract HH:MM from a time or datetime string. Returns '—' if empty. */
export function formatTime(value?: string): string {
  if (!value) return '—'
  return value.slice(0, 5)
}

/** Get Chinese weekday character (日/一/二/三/四/五/六) from a date string. */
export function getWeekday(value: string): string {
  const date = new Date(value)
  return WEEKDAYS[date.getDay()] ?? ''
}

/** Compute start/end dates and display label for a month offset from today. */
export function getMonthRange(offset: number): { start: string; end: string; label: string } {
  const date = new Date()
  date.setMonth(date.getMonth() + offset)
  const year = date.getFullYear()
  const month = date.getMonth()
  const start = new Date(year, month, 1)
  const end = new Date(year, month + 1, 0)
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `${year}年${month + 1}月`,
  }
}
