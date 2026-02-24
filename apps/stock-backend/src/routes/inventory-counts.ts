import { Hono } from 'hono';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/index';
import {
  stockBarcodes,
  stockInventory,
  stockInventoryCountItems,
  stockInventoryCounts,
  stockItems,
  stockTransactions,
} from '@94cram/shared/db';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { getTenantId, tenantMiddleware } from '../middleware/tenant';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await db.select().from(stockInventoryCounts)
    .where(eq(stockInventoryCounts.tenantId, tenantId))
    .orderBy(desc(stockInventoryCounts.createdAt));
  return c.json(rows);
});

app.post('/', async (c) => {
  const tenantId = getTenantId(c);
  const authUser = getAuthUser(c);
  const body = await c.req.json();
  if (!body.warehouseId || !body.name) return c.json({ error: 'warehouseId and name are required' }, 400);

  const [created] = await db.insert(stockInventoryCounts).values({
    tenantId,
    warehouseId: body.warehouseId,
    name: body.name,
    status: 'draft',
    createdBy: authUser.id,
  }).returning();
  return c.json(created, 201);
});

app.get('/:id', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [count] = await db.select().from(stockInventoryCounts).where(and(
    eq(stockInventoryCounts.id, id),
    eq(stockInventoryCounts.tenantId, tenantId),
  ));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);
  return c.json(count);
});

app.get('/:id/items', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');

  const [count] = await db.select().from(stockInventoryCounts).where(and(
    eq(stockInventoryCounts.id, id),
    eq(stockInventoryCounts.tenantId, tenantId),
  ));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);

  const rows = await db.select({
    countItem: stockInventoryCountItems,
    item: stockItems,
  }).from(stockInventoryCountItems)
    .innerJoin(stockItems, eq(stockInventoryCountItems.itemId, stockItems.id))
    .where(eq(stockInventoryCountItems.countId, id));

  return c.json(rows);
});

app.post('/:id/start', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [count] = await db.select().from(stockInventoryCounts).where(and(
    eq(stockInventoryCounts.id, id),
    eq(stockInventoryCounts.tenantId, tenantId),
  ));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);
  if (count.status !== 'draft') return c.json({ error: 'Only draft task can start' }, 400);

  const items = await db.select().from(stockInventory).where(and(
    eq(stockInventory.tenantId, tenantId),
    eq(stockInventory.warehouseId, count.warehouseId),
  ));

  for (const row of items) {
    await db.insert(stockInventoryCountItems).values({
      countId: id,
      itemId: row.itemId,
      systemQuantity: row.quantity,
    });
  }

  const [updated] = await db.update(stockInventoryCounts).set({
    status: 'counting',
    startedAt: new Date(),
  }).where(eq(stockInventoryCounts.id, id)).returning();

  return c.json(updated);
});

app.post('/:id/items/:itemId/count', async (c) => {
  const tenantId = getTenantId(c);
  const authUser = getAuthUser(c);
  const id = c.req.param('id');
  const itemId = c.req.param('itemId');
  const body = await c.req.json();

  const [count] = await db.select().from(stockInventoryCounts).where(and(
    eq(stockInventoryCounts.id, id),
    eq(stockInventoryCounts.tenantId, tenantId),
  ));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);
  if (count.status !== 'counting') return c.json({ error: 'Task is not counting' }, 400);

  const quantity = Number(body.countedQuantity);
  if (!Number.isFinite(quantity) || quantity < 0) return c.json({ error: 'Invalid countedQuantity' }, 400);

  const [countItem] = await db.select().from(stockInventoryCountItems).where(and(
    eq(stockInventoryCountItems.countId, id),
    eq(stockInventoryCountItems.itemId, itemId),
  ));

  const difference = quantity - (countItem?.systemQuantity || 0);
  if (countItem) {
    const [updated] = await db.update(stockInventoryCountItems).set({
      countedQuantity: quantity,
      difference,
      barcode: body.barcode,
      countedBy: authUser.id,
      countedAt: new Date(),
      notes: body.notes,
    }).where(eq(stockInventoryCountItems.id, countItem.id)).returning();
    return c.json(updated);
  }

  const [inventory] = await db.select().from(stockInventory).where(and(
    eq(stockInventory.tenantId, tenantId),
    eq(stockInventory.warehouseId, count.warehouseId),
    eq(stockInventory.itemId, itemId),
  ));

  const [created] = await db.insert(stockInventoryCountItems).values({
    countId: id,
    itemId,
    systemQuantity: inventory?.quantity || 0,
    countedQuantity: quantity,
    difference,
    barcode: body.barcode,
    countedBy: authUser.id,
    countedAt: new Date(),
    notes: body.notes,
  }).returning();
  return c.json(created, 201);
});

app.post('/:id/complete', async (c) => {
  const tenantId = getTenantId(c);
  const authUser = getAuthUser(c);
  const id = c.req.param('id');

  const [count] = await db.select().from(stockInventoryCounts).where(and(
    eq(stockInventoryCounts.id, id),
    eq(stockInventoryCounts.tenantId, tenantId),
  ));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);
  if (count.status !== 'counting') return c.json({ error: 'Task is not counting' }, 400);

  const items = await db.select().from(stockInventoryCountItems).where(eq(stockInventoryCountItems.countId, id));
  for (const row of items) {
    if (row.countedQuantity == null) continue;
    const diff = row.countedQuantity - row.systemQuantity;
    if (diff === 0) continue;

    const [inventory] = await db.select().from(stockInventory).where(and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.warehouseId, count.warehouseId),
      eq(stockInventory.itemId, row.itemId),
    ));

    if (inventory) {
      await db.update(stockInventory).set({
        quantity: row.countedQuantity,
        lastUpdatedAt: new Date(),
      }).where(eq(stockInventory.id, inventory.id));
    } else {
      await db.insert(stockInventory).values({
        tenantId,
        warehouseId: count.warehouseId,
        itemId: row.itemId,
        quantity: row.countedQuantity,
        lastUpdatedAt: new Date(),
      });
    }

    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId: count.warehouseId,
      itemId: row.itemId,
      transactionType: 'inventory_adjustment',
      quantity: diff,
      referenceId: count.id,
      referenceType: 'inventory_count',
      performedBy: authUser.id,
      createdAt: new Date(),
    });
  }

  const [updated] = await db.update(stockInventoryCounts).set({
    status: 'completed',
    completedAt: new Date(),
  }).where(eq(stockInventoryCounts.id, id)).returning();

  return c.json(updated);
});

app.post('/:id/items/scan', async (c) => {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const body = await c.req.json();
  if (!body.barcode) return c.json({ error: 'barcode is required' }, 400);

  const [count] = await db.select().from(stockInventoryCounts).where(and(eq(stockInventoryCounts.id, id), eq(stockInventoryCounts.tenantId, tenantId)));
  if (!count) return c.json({ error: 'Inventory count not found' }, 404);

  const [barcode] = await db.select().from(stockBarcodes).where(and(
    eq(stockBarcodes.tenantId, tenantId),
    eq(stockBarcodes.barcode, body.barcode),
  ));
  if (!barcode) return c.json({ error: 'Barcode not found' }, 404);

  const [item] = await db.select().from(stockItems).where(eq(stockItems.id, barcode.itemId));
  return c.json({ barcode, item });
});

export default app;
