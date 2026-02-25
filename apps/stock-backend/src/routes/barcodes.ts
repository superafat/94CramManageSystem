import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockBarcodes, stockItems } from '@94cram/shared/db';
import { authMiddleware } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';
import { z } from 'zod';

const barcodeCreateSchema = z.object({
  itemId: z.string().uuid(),
  barcode: z.string().min(1),
  barcodeType: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await db.select({
    barcode: stockBarcodes,
    itemName: stockItems.name,
  }).from(stockBarcodes)
    .innerJoin(stockItems, eq(stockBarcodes.itemId, stockItems.id))
    .where(eq(stockBarcodes.tenantId, tenantId));
  return c.json(rows);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }
  const parsed = barcodeCreateSchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const body = parsed.data;

  const [created] = await db.insert(stockBarcodes).values({
    tenantId,
    itemId: body.itemId,
    barcode: body.barcode,
    barcodeType: body.barcodeType ?? 'code128',
    isPrimary: body.isPrimary ?? false,
  }).returning();
  return c.json(created, 201);
});

app.delete('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [deleted] = await db.delete(stockBarcodes).where(and(
    eq(stockBarcodes.id, id),
    eq(stockBarcodes.tenantId, tenantId),
  )).returning();
  if (!deleted) return c.json({ error: 'Barcode not found' }, 404);
  return c.json({ message: 'Barcode deleted' });
});

app.get('/lookup/:barcode', async (c) => {
  const tenantId = getTenantId(c);
  const barcode = c.req.param('barcode');

  const [row] = await db.select({
    barcode: stockBarcodes,
    item: stockItems,
  }).from(stockBarcodes)
    .innerJoin(stockItems, eq(stockBarcodes.itemId, stockItems.id))
    .where(and(eq(stockBarcodes.tenantId, tenantId), eq(stockBarcodes.barcode, barcode)));

  if (!row) return c.json({ error: 'Barcode not found' }, 404);
  return c.json(row);
});

export default app;
