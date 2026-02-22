import { Hono } from 'hono';
import { db } from '../db/index';
import { stockItems } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';

const app = new Hono();

app.use('*', tenantMiddleware);

// GET all items for a tenant
app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const items = await db.select()
    .from(stockItems)
    .where(eq(stockItems.tenantId, tenantId));
  return c.json(items);
});

// GET single item
app.get('/:id', async (c) => {
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
});

// POST create item
app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  
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
});

// PUT update item
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  
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
});

// DELETE item
app.delete('/:id', async (c) => {
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
});

export default app;
