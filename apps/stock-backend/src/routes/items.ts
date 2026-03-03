import { Hono } from 'hono';
import { db } from '../db/index';
import { stockItems } from '@94cram/shared/db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';
import { logger } from '../utils/logger';

const app = new Hono();
const nonEmptyString = z.string().trim().min(1);
const itemCreateSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: nonEmptyString,
  sku: z.string().optional(),
  unit: nonEmptyString,
  safetyStock: z.number().int().min(0).optional(),
  schoolYear: z.string().optional(),
  version: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});
const itemUpdateSchema = itemCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

app.use('*', authMiddleware, tenantMiddleware);

// GET all items for a tenant
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsed = paginationSchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };

    const items = await db.select()
      .from(stockItems)
      .where(eq(stockItems.tenantId, tenantId))
      .limit(limit)
      .offset(offset);
    return c.json(items);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET single item
app.get('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenantId = getTenantId(c);

    const [item] = await db.select()
      .from(stockItems)
      .where(and(
        eq(stockItems.id, id),
        eq(stockItems.tenantId, tenantId)
      ));

    if (!item) return c.json({ error: 'Item not found' }, 404);
    return c.json(item);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST create item
app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedBody = itemCreateSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    const body = parsedBody.data;

    const [item] = await db.insert(stockItems)
      .values({
        tenantId,
        categoryId: body.categoryId,
        name: body.name,
        sku: body.sku,
        unit: body.unit,
        safetyStock: body.safetyStock || 0,
        schoolYear: body.schoolYear,
        version: body.version,
        description: body.description,
        isActive: body.isActive !== undefined ? body.isActive : true,
      })
      .returning();

    return c.json(item, 201);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT update item
app.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenantId = getTenantId(c);
    const parsedBody = itemUpdateSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    const body = parsedBody.data;

    const [item] = await db.update(stockItems)
      .set({
        categoryId: body.categoryId,
        name: body.name,
        sku: body.sku,
        unit: body.unit,
        safetyStock: body.safetyStock,
        schoolYear: body.schoolYear,
        version: body.version,
        description: body.description,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(and(
        eq(stockItems.id, id),
        eq(stockItems.tenantId, tenantId)
      ))
      .returning();

    if (!item) return c.json({ error: 'Item not found' }, 404);
    return c.json(item);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE item
app.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const tenantId = getTenantId(c);

    const [deleted] = await db.delete(stockItems)
      .where(and(
        eq(stockItems.id, id),
        eq(stockItems.tenantId, tenantId)
      ))
      .returning();

    if (!deleted) return c.json({ error: 'Item not found' }, 404);
    return c.json({ message: 'Item deleted' });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
