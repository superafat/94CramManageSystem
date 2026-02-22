import { Hono } from 'hono';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';
import {
  applyPredictionToPurchaseOrder,
  getHistoricalUsage,
  getPredictions,
  runAutoReorderPrediction,
  runSemesterPrediction,
} from '../services/ai-predictions';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/predictions', async (c) => {
  const tenantId = getTenantId(c);
  const predictions = await getPredictions(tenantId);
  return c.json(predictions);
});

app.post('/predictions/semester', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const schoolYear = typeof body.schoolYear === 'string' ? body.schoolYear : '';
  const semester = typeof body.semester === 'string' ? body.semester : '';
  const classCount = Number(body.classCount || 0);
  const studentCount = Number(body.studentCount || 0);
  if (!schoolYear || !semester) {
    return c.json({ error: 'schoolYear and semester are required' }, 400);
  }
  const result = await runSemesterPrediction(tenantId, { schoolYear, semester, classCount, studentCount });
  return c.json(result);
});

app.post('/predictions/auto-reorder', async (c) => {
  const tenantId = getTenantId(c);
  const result = await runAutoReorderPrediction(tenantId);
  return c.json(result);
});

app.post('/predictions/:id/apply', async (c) => {
  const tenantId = getTenantId(c);
  const authUser = getAuthUser(c);
  const id = c.req.param('id');
  try {
    const order = await applyPredictionToPurchaseOrder(tenantId, id, authUser.id);
    return c.json(order, 201);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Apply failed' }, 400);
  }
});

app.get('/historical-usage', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await getHistoricalUsage(tenantId);
  return c.json(rows);
});

export default app;
