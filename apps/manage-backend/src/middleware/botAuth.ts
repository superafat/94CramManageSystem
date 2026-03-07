import { createMiddleware } from 'hono/factory';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../utils/logger'

const client = new OAuth2Client();
const BOT_SERVICE_ACCOUNT = 'deploy94@cram94-manage-system.iam.gserviceaccount.com';

export const botAuth = createMiddleware(async (c, next) => {
  try {
    const internalApiKey = process.env.INTERNAL_API_KEY;
    const requiresInternalKey = process.env.NODE_ENV === 'production' || Boolean(internalApiKey);
    const providedInternalKey = c.req.header('X-Internal-Key');
    if (requiresInternalKey && !internalApiKey) {
      logger.error('[botAuth] INTERNAL_API_KEY is required but missing');
      return c.json({ success: false, error: '服務未設定' }, 503);
    }
    if (requiresInternalKey && providedInternalKey !== internalApiKey) {
      return c.json({ success: false, error: '未授權：缺少內部金鑰' }, 401);
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: '未授權：缺少 token' }, 401);
    }

    const token = authHeader.split(' ')[1];

    const serviceUrl = process.env.SERVICE_URL;
    if (!serviceUrl) {
      logger.error('[botAuth] SERVICE_URL is not configured');
      return c.json({ success: false, error: '服務未設定' }, 503);
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: serviceUrl,
    });

    const payload = ticket.getPayload();
    if (payload?.email !== BOT_SERVICE_ACCOUNT) {
      return c.json({ success: false, error: '非授權服務' }, 403);
    }

    const body = await c.req.json();
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return c.json({ success: false, error: '請求格式錯誤' }, 400);
    }

    const tenantId = body.tenant_id;
    if (!tenantId) {
      return c.json({ success: false, error: '缺少 tenant_id' }, 400);
    }

    c.set('tenantId', tenantId);
    c.set('botRequest', true);
    c.set('botBody', body);
    await next();
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, '[botAuth] Error');
    return c.json({ success: false, error: '認證失敗' }, 401);
  }
});
