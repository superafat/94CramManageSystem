/**
 * LINE Bot Webhook — 聞仲老師 AI 客服
 * POST /webhook/line
 *
 * 安全性：HMAC-SHA256 signature 驗證（LINE_CHANNEL_SECRET）
 * 始終回傳 200 給 LINE 避免重試
 */
import { Hono } from 'hono';
import { verifyLineSignature, sendLineReplyMessage, getLineProfile } from '../services/line';
import { callBotApi, callBotApiGet } from '../modules/api-client';
import { logger } from '../utils/logger';
import type { LineEvent, LineWebhookBody } from '../services/line';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';

// ===== 聞仲老師 System Prompts =====

const WENZHONG_PARENT_PROMPT = `你是補習班的教育顧問「聞仲老師」，在 LINE 上協助家長查詢孩子學習狀況。

【最高優先規則】
⛔ 絕對禁止捏造行動。你沒有打電話、沒有聯繫任何人、沒有查系統。你只能在 LINE 上打字。
⛔ 不可以說「我已經幫你聯繫了」「主管說…」「我查了一下」— 這些全是假的。
✅ 你唯一能做的事：在 LINE 上回覆文字訊息。不確定就說「我幫你問一下」然後停住。

核心規則：
- 回覆簡短自然，1-3 句。LINE 聊天不寫長文。
- 直接回答，不要每次自我介紹。
- 不要條列式。
- 認真看對話紀錄，說過的不要再問。
- 一律用「你」，禁止用「您」。
- emoji 偶爾用。

你可以協助家長：查詢孩子出勤、了解學費、預約試聽。
你查不到學生即時狀況，只能說「我幫你問一下」。

絕對禁止：說「作為AI」「本座」、條列式、用「您」、捏造任何已完成的行動`;

const WENZHONG_STUDENT_PROMPT = `你是補習班的「聞仲老師」，在 LINE 上跟學生聊天。像學長一樣，輕鬆但關心。

【最高優先規則】
⛔ 絕對禁止捏造行動。你沒有查成績、沒有聯繫任何人。你只能在 LINE 打字。
✅ 你唯一能做的：在 LINE 回覆文字。

規則：
- 回覆簡短自然，1-3 句
- 記住前面對話說過的事
- 不幫作弊，學費叫他問爸媽
- 用「你」不用「您」
- 不要說「作為AI」「本座」`;

const WENZHONG_DEFAULT_PROMPT = `你是補習班的「聞仲老師」，在 LINE 上回覆訊息。

【最高優先規則】
⛔ 絕對禁止捏造行動。你沒有打電話、沒有聯繫任何人、沒有查系統。你只能在 LINE 打字。
✅ 你唯一能做的：在 LINE 回覆文字訊息。不確定就說「我幫你問一下」然後停住。

規則：
- 說話自然簡短，1-3 句
- 記住前面的對話
- 補習班，國小到國中課輔
- 用「你」不用「您」
- 不要說「作為AI」「本座」
- 不要條列式、不要每次自我介紹`;

// ===== Gemini AI =====

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

interface ConversationTurn {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface ConversationRow {
  user_message?: unknown;
  bot_reply?: unknown;
}

async function generateLineReply(
  userMessage: string,
  systemPrompt: string,
  history: ConversationTurn[]
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: { temperature: 0.7 },
    });

    const contents: ConversationTurn[] = [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
    ];

    const result = await model.generateContent({
      contents,
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    });

    return result.response.text().trim() || '不好意思，我現在有點忙，稍後再試試看～';
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] AI generation error');
    return '不好意思，系統有點忙，稍等一下再試試～';
  }
}

// ===== Webhook App =====

export const lineWebhook = new Hono();

lineWebhook.post('/', async (c) => {
  // Always return 200 to LINE — errors are handled internally
  try {
    const signature = c.req.header('x-line-signature');
    const rawBody = await c.req.text();
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    if (!signature || !channelSecret) {
      logger.warn('[LINE] Missing signature or LINE_CHANNEL_SECRET');
      return c.json({ ok: true });
    }

    if (!rawBody || rawBody.length === 0) {
      logger.warn('[LINE] Empty request body');
      return c.json({ ok: true });
    }

    if (rawBody.length > 1_000_000) {
      logger.warn({ bodyLength: rawBody.length }, '[LINE] Request body too large');
      return c.json({ ok: true });
    }

    if (!verifyLineSignature(rawBody, signature, channelSecret)) {
      logger.warn('[LINE] Invalid signature');
      // Still return 200 to avoid LINE treating as error and retrying
      return c.json({ ok: true });
    }

    let body: LineWebhookBody;
    try {
      body = JSON.parse(rawBody) as LineWebhookBody;
    } catch {
      logger.error('[LINE] Invalid JSON body');
      return c.json({ ok: true });
    }

    if (!body.events || !Array.isArray(body.events)) {
      return c.json({ ok: true });
    }

    const events = body.events.slice(0, 100);

    // Process events asynchronously to respond quickly to LINE
    for (const event of events) {
      if (event && typeof event === 'object' && event.type) {
        setTimeout(() => {
          processLineEvent(event).catch((err: unknown) => {
            logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[LINE] Event processing error');
          });
        }, 0);
      }
    }

    return c.json({ ok: true });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] Webhook handler error');
    return c.json({ ok: true });
  }
});

// ===== Event Handlers =====

async function processLineEvent(event: LineEvent): Promise<void> {
  if (!event.source) return;

  switch (event.type) {
    case 'message':
      if (event.source.userId) {
        await handleMessageEvent(event);
      }
      break;
    case 'follow':
      if (event.source.userId) {
        await handleFollowEvent(event);
      }
      break;
    case 'unfollow':
      if (event.source.userId) {
        logger.info({ userId: event.source.userId }, '[LINE] User unfollowed');
      }
      break;
    default:
      logger.info({ eventType: event.type }, '[LINE] Unhandled event type');
  }
}

async function handleMessageEvent(event: LineEvent): Promise<void> {
  if (!event.message || event.message.type !== 'text') return;

  const lineUserId = event.source?.userId;
  const replyToken = event.replyToken;

  if (!lineUserId || !replyToken) {
    logger.error('[LINE] Missing lineUserId or replyToken in message event');
    return;
  }

  const messageText = (event.message.text ?? '').trim();
  if (!messageText) return;

  if (messageText.length > 2000) {
    await sendLineReplyMessage(replyToken, [{ type: 'text', text: '訊息太長了，請簡短一點～' }]);
    return;
  }

  try {
    // ===== 綁定指令 =====
    // 格式: 綁定 學生姓名 手機末4碼
    const bindMatch = messageText.match(/^綁定\s+(\S+)\s+(\d{4})$/);
    if (bindMatch) {
      const studentName = bindMatch[1];
      const phoneLast4 = bindMatch[2];

      if (studentName.length > 50) {
        await sendLineReplyMessage(replyToken, [{ type: 'text', text: '學生姓名太長，請重新輸入' }]);
        return;
      }

      const bindResult = await callBotApi('manage', '/line/bind', {
        line_user_id: lineUserId,
        student_name: studentName,
        phone_last_4: phoneLast4,
      });

      let replyText: string;
      if (bindResult.success) {
        const username = (bindResult.data as { username?: string } | undefined)?.username ?? '';
        replyText = `✅ 綁定成功！${username}，歡迎使用補習班 LINE 服務～`;
      } else {
        replyText = bindResult.message ?? '綁定失敗，請確認姓名和手機末4碼是否正確';
      }

      await sendLineReplyMessage(replyToken, [{ type: 'text', text: replyText }]);
      return;
    }

    // ===== 一般訊息 =====

    // 1. 查詢用戶
    const userResult = await callBotApi('manage', '/line/user-by-line-id', { line_user_id: lineUserId });
    const user = userResult.success
      ? (userResult.data as { user?: { id?: string; username?: string; role?: string; tenant_id?: string; branch_id?: string } | null } | undefined)?.user ?? null
      : null;

    let systemPrompt = WENZHONG_DEFAULT_PROMPT;
    let userName = '';
    let userRole: 'parent' | 'student' | 'guest' = 'guest';

    if (!user) {
      // 未綁定用戶 — 取 LINE profile 顯示名稱
      const profile = await getLineProfile(lineUserId);
      const displayName = profile?.displayName ?? '';

      // 問候語時引導綁定
      if (/^(嗨|哈囉|你好|hi|hello)/i.test(messageText)) {
        const greetMsg = `${displayName} 你好！👋\n\n我是補習班的聞仲老師～\n\n首次使用請先綁定帳號：\n輸入「綁定 學生姓名 手機末4碼」\n例如：綁定 陳小明 0912`;
        await sendLineReplyMessage(replyToken, [{ type: 'text', text: greetMsg }]);
        return;
      }

      userName = displayName;
      userRole = 'guest';
    } else {
      userName = user.username ?? '';
      const rawRole = user.role ?? '';
      if (rawRole === 'parent' || rawRole === 'student') {
        userRole = rawRole;
      }
      if (userRole === 'parent') systemPrompt = WENZHONG_PARENT_PROMPT;
      else if (userRole === 'student') systemPrompt = WENZHONG_STUDENT_PROMPT;
    }

    // 2. 取對話歷史（最近 6 輪）
    const historyResult = await callBotApiGet('manage', '/line/conversations', {
      line_user_id: lineUserId,
      limit: 6,
    });

    const conversationRows: ConversationRow[] = historyResult.success
      ? Array.isArray((historyResult.data as { conversations?: unknown } | undefined)?.conversations)
        ? ((historyResult.data as { conversations: ConversationRow[] }).conversations)
        : []
      : [];

    // Build Gemini conversation history (oldest first)
    const history: ConversationTurn[] = [];
    for (let i = conversationRows.length - 1; i >= 0; i--) {
      const row = conversationRows[i];
      if (typeof row.user_message === 'string' && typeof row.bot_reply === 'string') {
        history.push({ role: 'user', parts: [{ text: row.user_message }] });
        history.push({ role: 'model', parts: [{ text: row.bot_reply }] });
      }
    }

    // 3. AI 生成回覆
    const startMs = Date.now();
    const reply = await generateLineReply(messageText, systemPrompt, history);
    const latencyMs = Date.now() - startMs;

    // 4. 回覆用戶
    await sendLineReplyMessage(replyToken, [{ type: 'text', text: reply }]);

    // 5. 儲存對話紀錄（fire-and-forget）
    callBotApi('manage', '/line/conversations', {
      line_user_id: lineUserId,
      user_name: userName || 'Unknown',
      user_role: userRole,
      user_message: messageText,
      bot_reply: reply,
      intent: 'chat',
      model: 'gemini',
      latency_ms: latencyMs,
    }).catch((err: unknown) => {
      logger.error({ err: err instanceof Error ? err : new Error(String(err)) }, '[LINE] Failed to save conversation');
    });

  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] handleMessageEvent error');
    try {
      await sendLineReplyMessage(replyToken, [{ type: 'text', text: '不好意思，系統有點忙，稍等一下再試試～' }]);
    } catch (sendErr) {
      logger.error({ err: sendErr instanceof Error ? sendErr : new Error(String(sendErr)) }, '[LINE] Failed to send error reply');
    }
  }
}

async function handleFollowEvent(event: LineEvent): Promise<void> {
  const userId = event.source?.userId;
  const replyToken = event.replyToken;

  if (!userId || !replyToken) {
    logger.error('[LINE] Missing userId or replyToken in follow event');
    return;
  }

  try {
    // Check if already bound
    const userResult = await callBotApi('manage', '/line/user-by-line-id', { line_user_id: userId });
    const user = userResult.success
      ? (userResult.data as { user?: { username?: string } | null } | undefined)?.user ?? null
      : null;

    let name = '';
    if (!user) {
      const profile = await getLineProfile(userId);
      name = profile?.displayName ?? '';
    }

    const msg = user
      ? `${user.username ?? ''} 你好～歡迎回來！有問題隨時找我 👋`
      : `${name} 你好！我是補習班的聞仲老師～\n\n首次使用請先綁定帳號：\n輸入「綁定 學生姓名 手機末4碼」\n例如：綁定 陳小明 0912`;

    await sendLineReplyMessage(replyToken, [{ type: 'text', text: msg }]);
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[LINE] handleFollowEvent error');
    try {
      await sendLineReplyMessage(replyToken, [{ type: 'text', text: '歡迎！有問題隨時問我～' }]);
    } catch (sendErr) {
      logger.error({ err: sendErr instanceof Error ? sendErr : new Error(String(sendErr)) }, '[LINE] Failed to send fallback follow message');
    }
  }
}
