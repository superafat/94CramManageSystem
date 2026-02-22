import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockSuppliers } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const suppliers = await db.select().from(stockSuppliers).where(eq(stockSuppliers.tenantId, tenantId));
  return c.json(suppliers);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  const [created] = await db.insert(stockSuppliers).values({
    tenantId,
    name: body.name,
    contactName: body.contactName,
    phone: body.phone,
    email: body.email,
    address: body.address,
    notes: body.notes,
  }).returning();
  return c.json(created, 201);
});

app.put('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  const [updated] = await db.update(stockSuppliers).set({
    name: body.name,
    contactName: body.contactName,
    phone: body.phone,
    email: body.email,
    address: body.address,
    notes: body.notes,
  }).where(and(eq(stockSuppliers.id, id), eq(stockSuppliers.tenantId, tenantId))).returning();

  if (!updated) return c.json({ error: 'Supplier not found' }, 404);
  return c.json(updated);
});

app.delete('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [deleted] = await db.delete(stockSuppliers).where(and(eq(stockSuppliers.id, id), eq(stockSuppliers.tenantId, tenantId))).returning();
  if (!deleted) return c.json({ error: 'Supplier not found' }, 404);
  return c.json({ message: 'Supplier deleted' });
});

export default app;
