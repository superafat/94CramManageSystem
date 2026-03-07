import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { queryConversations, type ConversationQuery } from '../firestore/bot-conversations';
import type { BotType } from '../firestore/bot-prompt-settings';

type Env = { Variables: { user: DashboardUser } };

export const conversationsRouter = new Hono<Env>();

conversationsRouter.get('/', async (c) => {
  const user = c.get('user');
  const botType = c.req.query('botType') as BotType | undefined;
  const platform = c.req.query('platform') as 'telegram' | 'line' | undefined;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');

  const query: ConversationQuery = {
    tenantId: user.tenantId,
    botType: botType || undefined,
    platform: platform || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: limit ? parseInt(limit, 10) : 50,
    startAfter: cursor || undefined,
  };

  const conversations = await queryConversations(query);
  return c.json(conversations);
});

conversationsRouter.get('/export', async (c) => {
  const user = c.get('user');
  const botType = c.req.query('botType') as BotType | undefined;
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');

  const conversations = await queryConversations({
    tenantId: user.tenantId,
    botType: botType || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    limit: 5000,
  });

  const header = 'ID,Bot,Platform,User,Role,Message,Reply,Intent,Model,Latency(ms),Time\n';
  const rows = conversations.map((conv) => {
    const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    return [
      conv.id,
      conv.botType,
      conv.platform,
      escape(conv.userName),
      conv.userRole,
      escape(conv.userMessage),
      escape(conv.botReply),
      conv.intent,
      conv.model,
      conv.latencyMs,
      new Date(conv.createdAt).toISOString(),
    ].join(',');
  }).join('\n');

  c.header('Content-Type', 'text/csv; charset=utf-8');
  c.header('Content-Disposition', 'attachment; filename="conversations.csv"');
  return c.body(header + rows);
});
