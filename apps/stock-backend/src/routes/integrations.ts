import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';
import { getIntegrationSettings, getStudents, syncAll, upsertIntegrationSettings } from '../services/integration-94manage';
import { db } from '../db/index';
import { stockIntegrationSettings } from '../db/schema';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/settings', async (c) => {
  const tenantId = getTenantId(c);
  const settings = await getIntegrationSettings(tenantId);
  return c.json(settings ?? {
    integrationType: '94manage',
    apiEndpoint: '',
    apiKey: '',
    isEnabled: false,
    lastSyncAt: null,
  });
});

app.put('/settings', async (c) => {
  if (getAuthUser(c).role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const updated = await upsertIntegrationSettings(tenantId, {
    apiEndpoint: body.apiEndpoint,
    apiKey: body.apiKey,
    isEnabled: body.isEnabled,
  });
  return c.json(updated);
});

app.post('/sync', async (c) => {
  if (getAuthUser(c).role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
  const tenantId = getTenantId(c);
  const result = await syncAll(tenantId);
  return c.json(result);
});

app.get('/students', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await getStudents(tenantId);
  return c.json(rows);
});

app.get('/sync-status', async (c) => {
  const tenantId = getTenantId(c);
  const settings = await getIntegrationSettings(tenantId);
  if (!settings) {
    return c.json({ enabled: false, lastSyncAt: null, status: 'not_configured' });
  }

  const [latest] = await db.select().from(stockIntegrationSettings).where(eq(stockIntegrationSettings.id, settings.id));
  return c.json({
    enabled: settings.isEnabled,
    lastSyncAt: latest?.lastSyncAt || null,
    status: settings.isEnabled ? 'ready' : 'disabled',
  });
});

export default app;
