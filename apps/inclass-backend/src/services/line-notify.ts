/**
 * LINE 通知推送服務
 * 使用 LINE Messaging API Push Message 功能
 */
import { logger } from '../utils/logger.js'

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
const LIFF_ID = process.env.LINE_LIFF_ID ?? ''

export interface ContactBookSummary {
  studentName: string
  entryDate: string
  courseName: string
  scores: Array<{ subject: string; score: string }>
  homework: string | null
  teacherTip: string | null
  entryId: string
}

interface LineFlexMessage {
  type: 'flex'
  altText: string
  contents: LineFlexBubble
}

interface LineFlexBubble {
  type: 'bubble'
  header: LineFlexBox
  body: LineFlexBox
  footer: LineFlexBox
}

interface LineFlexBox {
  type: 'box'
  layout: string
  contents: LineFlexComponent[]
  backgroundColor?: string
  paddingAll?: string
}

type LineFlexComponent =
  | { type: 'text'; text: string; weight?: string; size?: string; color?: string; wrap?: boolean; margin?: string }
  | { type: 'button'; action: { type: 'uri'; label: string; uri: string }; style?: string; color?: string; margin?: string }
  | { type: 'separator' }

function buildFlexMessage(summary: ContactBookSummary): LineFlexMessage {
  const bodyContents: LineFlexComponent[] = []

  // 成績摘要
  if (summary.scores.length > 0) {
    bodyContents.push({
      type: 'text',
      text: '📝 成績',
      weight: 'bold',
      size: 'sm',
      color: '#555555',
    })
    for (const s of summary.scores) {
      bodyContents.push({
        type: 'text',
        text: `${s.subject}: ${s.score}`,
        size: 'sm',
        color: '#333333',
        margin: 'xs',
      })
    }
  }

  // 作業摘要
  if (summary.homework) {
    if (bodyContents.length > 0) {
      bodyContents.push({ type: 'separator' })
    }
    bodyContents.push({
      type: 'text',
      text: '📚 作業',
      weight: 'bold',
      size: 'sm',
      color: '#555555',
      margin: 'md',
    })
    bodyContents.push({
      type: 'text',
      text: summary.homework.slice(0, 50),
      size: 'sm',
      color: '#333333',
      wrap: true,
      margin: 'xs',
    })
  }

  // 老師小叮嚀
  if (summary.teacherTip) {
    if (bodyContents.length > 0) {
      bodyContents.push({ type: 'separator' })
    }
    bodyContents.push({
      type: 'text',
      text: '💡 老師小叮嚀',
      weight: 'bold',
      size: 'sm',
      color: '#555555',
      margin: 'md',
    })
    bodyContents.push({
      type: 'text',
      text: summary.teacherTip.slice(0, 50),
      size: 'sm',
      color: '#333333',
      wrap: true,
      margin: 'xs',
    })
  }

  // 若沒有任何內容，顯示預設文字
  if (bodyContents.length === 0) {
    bodyContents.push({
      type: 'text',
      text: '今日聯絡簿已送出，請點擊下方查看詳情。',
      size: 'sm',
      color: '#555555',
      wrap: true,
    })
  }

  const liffUrl = `https://liff.line.me/${LIFF_ID}/contact-book/${summary.entryId}`

  return {
    type: 'flex',
    altText: `📖 ${summary.studentName} 的今日聯絡簿（${summary.entryDate}）`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#4A90D9',
        paddingAll: 'md',
        contents: [
          {
            type: 'text',
            text: `📖 ${summary.studentName} 的今日聯絡簿`,
            weight: 'bold',
            color: '#FFFFFF',
            size: 'md',
            wrap: true,
          },
          {
            type: 'text',
            text: summary.entryDate,
            color: '#DDEEFF',
            size: 'sm',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: 'md',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '查看完整聯絡簿',
              uri: liffUrl,
            },
            style: 'primary',
            color: '#4A90D9',
          },
        ],
      },
    },
  }
}

/**
 * 推送聯絡簿通知給家長的 LINE
 * 失敗時只 log warning，不 throw
 */
export async function pushContactBookNotification(
  lineUserId: string,
  summary: ContactBookSummary
): Promise<boolean> {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    logger.warn('[LineNotify] LINE_CHANNEL_ACCESS_TOKEN not configured, skipping push')
    return false
  }

  if (!LIFF_ID) {
    logger.warn('[LineNotify] LINE_LIFF_ID not configured, skipping push')
    return false
  }

  const flexMessage = buildFlexMessage(summary)

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [flexMessage],
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      logger.warn(
        { status: response.status, body, lineUserId },
        '[LineNotify] Push message failed'
      )
      return false
    }

    logger.info({ lineUserId, entryId: summary.entryId }, '[LineNotify] Push message sent')
    return true
  } catch (error) {
    logger.warn({ err: error, lineUserId }, '[LineNotify] Push message error')
    return false
  }
}
