import { Hono } from 'hono';
import { getAuthUser, authMiddleware } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';
import {
  getNotificationHistory,
  getNotificationSettings,
  NOTIFICATION_TYPES,
  sendSystemNotification,
  upsertNotificationSettings,
} from '../services/notifications';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/settings', async (c) => {
  const tenantId = getTenantId(c);
  const settings = await getNotificationSettings(tenantId);
  return c.json(settings);
});

app.put('/settings', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const payload: unknown[] = Array.isArray(body?.settings) ? body.settings : [body];

  const settings = payload
    .filter((row): row is { type: typeof NOTIFICATION_TYPES[number]; telegramChatId?: string; telegramBotToken?: string; isEnabled?: boolean } => {
      if (!row || typeof row !== 'object') return false;
      const candidate = row as { type?: string };
      return typeof candidate.type === 'string' && NOTIFICATION_TYPES.includes(candidate.type as typeof NOTIFICATION_TYPES[number]);
    })
    .map((row) => ({
      type: row.type,
      telegramChatId: row.telegramChatId,
      telegramBotToken: row.telegramBotToken,
      isEnabled: row.isEnabled,
    }));

  await upsertNotificationSettings(tenantId, settings);
  return c.json({ message: 'Settings updated' });
});

app.post('/test', async (c) => {
  const tenantId = getTenantId(c);
  const authUser = getAuthUser(c);
  const body = await c.req.json();
  const title = body.title || '測試通知';
  const message = body.message || `來自 94Stock 的測試通知，操作者：${authUser.name || authUser.email}`;
  await sendSystemNotification(tenantId, title, message);
  return c.json({ message: 'Test notification sent' });
});

app.get('/history', async (c) => {
  const tenantId = getTenantId(c);
  const history = await getNotificationHistory(tenantId);
  return c.json(history);
});

export default app;
