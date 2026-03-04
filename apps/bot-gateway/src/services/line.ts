/**
 * LINE Messaging API Service
 * 提供 signature 驗證、Reply/Push 訊息發送、取得用戶資料
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../utils/logger';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// ===== Type Definitions =====

export interface LineMessage {
  type: 'text';
  text: string;
}

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LineEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'postback' | 'beacon';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
    id: string;
    text?: string;
  };
}

export interface LineWebhookBody {
  destination?: string;
  events: LineEvent[];
}

function getLineAccessToken(): string | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    logger.error('[LINE] Missing LINE_CHANNEL_ACCESS_TOKEN');
    return null;
  }
  return token;
}

/**
 * 驗證 LINE webhook signature (HMAC-SHA256)
 * 必須使用 raw body，不能先 JSON.parse
 */
export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  try {
    if (!body || typeof body !== 'string') {
      logger.error('[LINE] Invalid body for signature verification');
      return false;
    }

    if (!signature || typeof signature !== 'string') {
      logger.error('[LINE] Invalid signature');
      return false;
    }

    if (!channelSecret) {
      logger.error('[LINE] Missing channelSecret');
      return false;
    }

    const hash = createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');

    // 使用常數時間比較防止 timing attack
    if (hash.length !== signature.length) return false;
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] Signature verification error');
    return false;
  }
}

function validateMessages(messages: LineMessage[]): boolean {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 5) {
    logger.error('[LINE] Messages must be array with 1-5 items');
    return false;
  }
  return true;
}

async function sendLineMessage(endpoint: string, payload: Record<string, unknown>): Promise<void> {
  const accessToken = getLineAccessToken();
  if (!accessToken) return;

  try {
    const response = await fetch(`${LINE_API_BASE}/message/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, body: errorBody }, `[LINE] ${endpoint} API error`);
    }
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, `[LINE] ${endpoint} error`);
  }
}

/**
 * LINE Reply Message API
 * 用於回覆 webhook event（一次性，只能用一次 replyToken）
 */
export async function sendLineReplyMessage(
  replyToken: string,
  messages: LineMessage[]
): Promise<void> {
  if (!replyToken || typeof replyToken !== 'string') {
    logger.error('[LINE] Invalid replyToken');
    return;
  }
  if (!validateMessages(messages)) return;
  await sendLineMessage('reply', { replyToken, messages });
}

/**
 * LINE Push Message API
 * 主動推播訊息給用戶（需要用戶的 LINE user ID）
 */
export async function sendLinePushMessage(
  to: string,
  messages: LineMessage[]
): Promise<void> {
  if (!to || typeof to !== 'string') {
    logger.error('[LINE] Invalid recipient userId');
    return;
  }
  if (!validateMessages(messages)) return;
  await sendLineMessage('push', { to, messages });
}

/**
 * 取得 LINE 用戶 Profile
 */
export async function getLineProfile(userId: string): Promise<LineProfile | null> {
  if (!userId || typeof userId !== 'string') {
    logger.error('[LINE] Invalid userId for getLineProfile');
    return null;
  }

  // 防止路徑遍歷攻擊
  if (userId.includes('/') || userId.includes('\\') || userId.includes('..')) {
    logger.error('[LINE] Invalid userId format');
    return null;
  }

  const accessToken = getLineAccessToken();
  if (!accessToken) return null;

  try {
    const response = await fetch(`${LINE_API_BASE}/profile/${encodeURIComponent(userId)}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error({ status: response.status, body: errorBody }, '[LINE] Profile API error');
      return null;
    }

    const profile = await response.json() as Record<string, unknown>;

    if (!profile || !profile.userId || !profile.displayName) {
      logger.error('[LINE] Invalid profile response');
      return null;
    }

    return {
      userId: String(profile.userId),
      displayName: String(profile.displayName),
      pictureUrl: profile.pictureUrl ? String(profile.pictureUrl) : undefined,
      statusMessage: profile.statusMessage ? String(profile.statusMessage) : undefined,
    };
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] Profile fetch error');
    return null;
  }
}
