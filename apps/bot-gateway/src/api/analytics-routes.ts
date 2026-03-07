import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getConversationStats } from '../firestore/bot-conversations';
import { getBotHealth } from '../firestore/bot-health';
import { firestore } from '../firestore/client';

type Env = { Variables: { user: DashboardUser } };

export const analyticsRouter = new Hono<Env>();

analyticsRouter.get('/overview', async (c) => {
  const user = c.get('user');
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayStats, monthStats, health] = await Promise.all([
    getConversationStats(user.tenantId, todayStart),
    getConversationStats(user.tenantId, monthStart),
    getBotHealth(user.tenantId),
  ]);

  return c.json({ today: todayStats, month: monthStats, health });
});

analyticsRouter.get('/trends', async (c) => {
  const user = c.get('user');
  const days = parseInt(c.req.query('days') || '7', 10);
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const snapshot = await firestore
    .collection('bot-conversations')
    .where('tenantId', '==', user.tenantId)
    .where('createdAt', '>=', startDate)
    .orderBy('createdAt', 'asc')
    .get();

  const trends: Record<string, Record<string, number>> = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
    const date = createdAt.toISOString().slice(0, 10);
    if (!trends[date]) trends[date] = {};
    trends[date][data.botType] = (trends[date][data.botType] || 0) + 1;
  }

  return c.json(trends);
});

analyticsRouter.get('/top-questions', async (c) => {
  const user = c.get('user');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const snapshot = await firestore
    .collection('bot-conversations')
    .where('tenantId', '==', user.tenantId)
    .where('createdAt', '>=', monthStart)
    .get();

  const questionCounts = new Map<string, number>();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.userMessage === 'string') {
      const msg = data.userMessage.slice(0, 50);
      questionCounts.set(msg, (questionCounts.get(msg) ?? 0) + 1);
    }
  }

  const topQuestions = Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([question, count]) => ({ question, count }));

  return c.json(topQuestions);
});
