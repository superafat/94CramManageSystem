import { Hono } from 'hono';
import { db } from '../db/index';
import { stockCategories } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';

const app = new Hono();

app.use('*', tenantMiddleware);

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
  const body = await c.req.json();
  
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
  const id = c.req.param('id');
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  
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
