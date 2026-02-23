import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockSuppliers } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();
const uuidParamSchema = z.object({ id: z.string().uuid() });
const supplierCreateSchema = z.object({
  name: z.string().trim().min(1),
  contactName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  address: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
}).strict();
const supplierUpdateSchema = supplierCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const suppliers = await db.select().from(stockSuppliers).where(eq(stockSuppliers.tenantId, tenantId));
  return c.json(suppliers);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const parsedBody = supplierCreateSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsedBody.data;
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
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid supplier id' }, 400);
  }
  const parsedBody = supplierUpdateSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const { id } = parsedParams.data;
  const body = parsedBody.data;
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
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid supplier id' }, 400);
  }
  const { id } = parsedParams.data;
  const [deleted] = await db.delete(stockSuppliers).where(and(eq(stockSuppliers.id, id), eq(stockSuppliers.tenantId, tenantId))).returning();
  if (!deleted) return c.json({ error: 'Supplier not found' }, 404);
  return c.json({ message: 'Supplier deleted' });
});

export default app;
