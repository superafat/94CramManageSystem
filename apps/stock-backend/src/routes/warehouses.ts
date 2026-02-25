import { Hono } from 'hono';
import { db } from '../db/index';
import { stockWarehouses } from '@94cram/shared/db';
import { and, eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();
const uuidParamSchema = z.object({ id: z.string().uuid() });
const warehouseCreateSchema = z.object({
  name: z.string().trim().min(1),
  code: z.string().trim().min(1),
  address: z.string().trim().min(1).optional(),
  isHeadquarters: z.boolean().optional(),
}).strict();
const warehouseUpdateSchema = warehouseCreateSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field is required' }
);

app.use('*', authMiddleware, tenantMiddleware);

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
  const tenantId = getTenantId(c);
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid warehouse id' }, 400);
  }
  const { id } = parsedParams.data;

  const [warehouse] = await db.select()
    .from(stockWarehouses)
    .where(and(
      eq(stockWarehouses.id, id),
      eq(stockWarehouses.tenantId, tenantId),
    ));

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// POST create warehouse
app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsedBody = warehouseCreateSchema.safeParse(requestBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsedBody.data;

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
  const tenantId = getTenantId(c);
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid warehouse id' }, 400);
  }
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsedBody = warehouseUpdateSchema.safeParse(requestBody);
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const { id } = parsedParams.data;
  const body = parsedBody.data;
  const updateData: {
    name?: string;
    code?: string;
    address?: string;
    isHeadquarters?: boolean;
  } = {};

  if ('name' in body) updateData.name = body.name;
  if ('code' in body) updateData.code = body.code;
  if ('address' in body) updateData.address = body.address;
  if ('isHeadquarters' in body) updateData.isHeadquarters = body.isHeadquarters;

  const [warehouse] = await db.update(stockWarehouses)
    .set(updateData)
    .where(and(
      eq(stockWarehouses.id, id),
      eq(stockWarehouses.tenantId, tenantId),
    ))
    .returning();

  if (!warehouse) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json(warehouse);
});

// DELETE warehouse
app.delete('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
  if (!parsedParams.success) {
    return c.json({ error: 'Invalid warehouse id' }, 400);
  }
  const { id } = parsedParams.data;

  const [deleted] = await db.delete(stockWarehouses)
    .where(and(
      eq(stockWarehouses.id, id),
      eq(stockWarehouses.tenantId, tenantId),
    ))
    .returning();

  if (!deleted) {
    return c.json({ error: 'Warehouse not found' }, 404);
  }

  return c.json({ message: 'Warehouse deleted' });
});

export default app;
