import { Hono } from 'hono';
import { z } from 'zod';
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
const semesterPredictionSchema = z.object({
  schoolYear: z.string().trim().min(1),
  semester: z.string().trim().min(1),
  classCount: z.coerce.number().int().min(0).default(0),
  studentCount: z.coerce.number().int().min(0).default(0),
});

app.use('*', authMiddleware, tenantMiddleware);

app.get('/predictions', async (c) => {
  const tenantId = getTenantId(c);
  const predictions = await getPredictions(tenantId);
  return c.json(predictions);
});

app.post('/predictions/semester', async (c) => {
  const tenantId = getTenantId(c);
  const parsedBody = semesterPredictionSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { schoolYear, semester, classCount, studentCount } = parsedBody.data;
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
