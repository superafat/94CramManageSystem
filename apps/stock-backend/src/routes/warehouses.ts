import { Hono } from 'hono';
import { db } from '../db/index';
import { stockWarehouses } from '../db/schema';
import { eq } from 'drizzle-orm';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';

const app = new Hono();

app.use('*', tenantMiddleware);

// GET all warehouses
app.get('/', async (c) => {
  const tenantId = getTenantId(c);

  const warehouses = await db.select()
    .from(stockWarehouses)
    .where(eq(stockWarehouses.tenantId, tenantId));

  return c.json(warehouses);
});

// GET single warehouse
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);

  const [warehouse] = await db.select()
    .from(stockWarehouses)
    .where(eq(stockWarehouses.id, id));

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// POST create warehouse
app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();

  const [warehouse] = await db.insert(stockWarehouses)
    .values({
      tenantId,
      name: body.name,
      code: body.code,
      address: body.address,
      isHeadquarters: body.isHeadquarters || false,
    })
    .returning();

  return c.json(warehouse, 201);
});

// PUT update warehouse
app.put('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);
  const body = await c.req.json();

  const [warehouse] = await db.update(stockWarehouses)
    .set({
      name: body.name,
      code: body.code,
      address: body.address,
      isHeadquarters: body.isHeadquarters,
    })
    .where(eq(stockWarehouses.id, id))
    .returning();

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// DELETE warehouse
app.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const tenantId = getTenantId(c);

  const [deleted] = await db.delete(stockWarehouses)
    .where(eq(stockWarehouses.id, id))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json({ message: 'Warehouse deleted' });
});

export default app;
