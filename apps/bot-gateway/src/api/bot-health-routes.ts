import { Hono } from 'hono';
import type { DashboardUser } from '../middleware/auth';
import { getBotHealth } from '../firestore/bot-health';

type Env = { Variables: { user: DashboardUser } };

export const botHealthRouter = new Hono<Env>();

botHealthRouter.get('/', async (c) => {
  const user = c.get('user');
  const health = await getBotHealth(user.tenantId);
  return c.json(health);
});
