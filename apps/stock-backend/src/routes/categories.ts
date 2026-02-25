import { Hono } from 'hono';
import { db } from '../db/index';
import { stockCategories } from '@94cram/shared/db';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const uuidParamSchema = z.object({ id: z.string().uuid() });
const categoryBodySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
});

const app = new Hono();

app.use('*', authMiddleware, tenantMiddleware);

// GET all categories
app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const categories = await db.select()
    .from(stockCategories)
    .where(eq(stockCategories.tenantId, tenantId));
  return c.json(categories);
});

// GET single category
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);

  const [category] = await db.select()
    .from(stockCategories)
    .where(and(
      eq(stockCategories.id, id),
      eq(stockCategories.tenantId, tenantId)
    ));

  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

// POST create category
app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = categoryBodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;

  const [category] = await db.insert(stockCategories)
    .values({
      tenantId,
      name: body.name,
      description: body.description,
      color: body.color,
    })
    .returning();

  return c.json(category, 201);
});

// PUT update category
app.put('/:id', async (c) => {
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid category id' }, 400);
  }
  const { id } = parsedParams.data;
  const tenantId = getTenantId(c);
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = categoryBodySchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;

  const [category] = await db.update(stockCategories)
    .set({
      name: body.name,
      description: body.description,
      color: body.color,
    })
    .where(and(
      eq(stockCategories.id, id),
      eq(stockCategories.tenantId, tenantId)
    ))
    .returning();

  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

// DELETE category
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);

  const [deleted] = await db.delete(stockCategories)
    .where(and(
      eq(stockCategories.id, id),
      eq(stockCategories.tenantId, tenantId)
    ))
    .returning();

  if (!deleted) return c.json({ error: 'Category not found' }, 404);
  return c.json({ message: 'Category deleted' });
});

export default app;
