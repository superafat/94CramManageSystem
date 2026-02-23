/**
 * Notification Service - 整合 imStudy 通知系統
 */

const IMSTUDY_API_URL = process.env.IMSTUDY_API_URL
if (!IMSTUDY_API_URL) {
  throw new Error('IMSTUDY_API_URL environment variable is required for notifications')
}

interface NotificationPayload {
  schoolId: string
  type: 'attendance' | 'grade' | 'payment'
  studentName: string
  parentLineId: string
  title: string
  body: string
  channel: 'line' | 'telegram'
}

/**
 * 發送通知給家長（透過 imStudy）
 */
export async function sendToParent(
  parentLineId: string,
  title: string,
  body: string,
  type: 'attendance' | 'grade' | 'payment',
  schoolId: string,
  studentName: string
): Promise<boolean> {
  try {
    const payload: NotificationPayload = {
      schoolId,
      type,
      studentName,
      parentLineId,
      title,
      body,
      channel: 'line'
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

    const response = await fetch(`${IMSTUDY_API_URL}/api/notifications/beaclass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ 通知發送失敗:', error)
      return false
    }

    const result = await response.json()
    console.log('✅ 通知已發送:', result)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ 通知發送異常:', message)
    return false
  }
}

/**
 * 到校通知
 */
export async function notifyAttendance(
  schoolId: string,
  studentName: string,
  parentLineId: string,
  checkInTime: Date
): Promise<boolean> {
  const time = checkInTime.toLocaleTimeString('zh-TW', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  })

  return sendToParent(
    parentLineId,
    '🎒 到校通知',
    `${studentName} 已於 ${time} 到校 ✅`,
    'attendance',
    schoolId,
    studentName
  )
}

/**
 * 遲到通知
 */
export async function notifyLate(
  schoolId: string,
  studentName: string,
  parentLineId: string,
  checkInTime: Date
): Promise<boolean> {
  const time = checkInTime.toLocaleTimeString('zh-TW', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZone: 'Asia/Taipei'
  })

  return sendToParent(
    parentLineId,
    '⏰ 遲到通知',
    `${studentName} 於 ${time} 到校（遲到）`,
    'attendance',
    schoolId,
    studentName
  )
}

/**
 * 缺席通知
 */
export async function notifyAbsent(
  schoolId: string,
  studentName: string,
  parentLineId: string
): Promise<boolean> {
  return sendToParent(
    parentLineId,
    '⚠️ 缺席通知',
    `${studentName} 今天未到校`,
    'attendance',
    schoolId,
    studentName
  )
}
