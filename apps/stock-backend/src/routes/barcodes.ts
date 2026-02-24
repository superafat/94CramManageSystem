import { Hono } from 'hono';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockBarcodes, stockItems } from '@94cram/shared/db';
import { authMiddleware } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';

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
  const body = await c.req.json();
  if (!body.itemId || !body.barcode) return c.json({ error: 'itemId and barcode are required' }, 400);

  const [created] = await db.insert(stockBarcodes).values({
    tenantId,
    itemId: body.itemId,
    barcode: body.barcode,
    barcodeType: body.barcodeType || 'code128',
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
