/**
 * 日期工具 - 統一使用 Asia/Taipei 時區
 */

/** 取得台灣時區的今日日期 YYYY-MM-DD */
export function getTodayTW(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(new Date())
}

/** 取得台灣時區的當月 YYYY-MM */
export function getThisMonthTW(): string {
  const d = new Date()
  const year = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', year: 'numeric' }).format(d)
  const month = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Taipei', month: '2-digit' }).format(d)
  return `${year}-${month}`
}

/** 驗證 UUID 格式 */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
