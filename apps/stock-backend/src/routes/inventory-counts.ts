import { Hono } from 'hono';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
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
import { logger } from '../utils/logger';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const rows = await db.select().from(stockInventoryCounts)
      .where(eq(stockInventoryCounts.tenantId, tenantId))
      .orderBy(desc(stockInventoryCounts.createdAt))
      .limit(1000);
    return c.json(rows);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/', async (c) => {
  try {
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
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const [count] = await db.select().from(stockInventoryCounts).where(and(
      eq(stockInventoryCounts.id, id),
      eq(stockInventoryCounts.tenantId, tenantId),
    ));
    if (!count) return c.json({ error: 'Inventory count not found' }, 404);
    return c.json(count);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/:id/items', async (c) => {
  try {
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
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/start', async (c) => {
  try {
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

    // Batch insert all count items in one query instead of one-by-one
    if (items.length > 0) {
      await db.insert(stockInventoryCountItems).values(
        items.map((row) => ({
          countId: id,
          itemId: row.itemId,
          systemQuantity: row.quantity,
        }))
      );
    }

    const [updated] = await db.update(stockInventoryCounts).set({
      status: 'counting',
      startedAt: new Date(),
    }).where(eq(stockInventoryCounts.id, id)).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/items/:itemId/count', async (c) => {
  try {
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
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/complete', async (c) => {
  try {
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

    // Filter to rows that have been counted and have a non-zero difference
    const changedItems = items.filter(
      (row) => row.countedQuantity != null && row.countedQuantity - row.systemQuantity !== 0
    ) as (typeof items[number] & { countedQuantity: number })[];

    if (changedItems.length > 0) {
      const now = new Date();
      const itemIds = changedItems.map((row) => row.itemId);

      // Fetch all existing inventory rows for affected items in one query
      const existingInventory = await db.select().from(stockInventory).where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, count.warehouseId),
        inArray(stockInventory.itemId, itemIds),
      ));
      const inventoryByItemId = new Map(existingInventory.map((inv) => [inv.itemId, inv]));

      const toInsert: (typeof changedItems[number])[] = [];
      const toUpdate: (typeof changedItems[number])[] = [];
      for (const row of changedItems) {
        if (inventoryByItemId.has(row.itemId)) {
          toUpdate.push(row);
        } else {
          toInsert.push(row);
        }
      }

      // Batch insert new inventory rows
      if (toInsert.length > 0) {
        await db.insert(stockInventory).values(
          toInsert.map((row) => ({
            tenantId,
            warehouseId: count.warehouseId,
            itemId: row.itemId,
            quantity: row.countedQuantity,
            lastUpdatedAt: now,
          }))
        );
      }

      // Batch update existing inventory rows using a single SQL CASE/WHEN statement
      if (toUpdate.length > 0) {
        const itemIdList = toUpdate.map((row) => row.itemId);
        const quantityCase = sql`CASE ${sql.join(
          toUpdate.map((row) => sql`WHEN ${stockInventory.itemId} = ${row.itemId} THEN ${row.countedQuantity}`),
          sql` `
        )} END`;
        await db.update(stockInventory).set({
          quantity: quantityCase,
          lastUpdatedAt: now,
        }).where(and(
          eq(stockInventory.tenantId, tenantId),
          eq(stockInventory.warehouseId, count.warehouseId),
          inArray(stockInventory.itemId, itemIdList),
        ));
      }

      // Batch insert all transaction records
      await db.insert(stockTransactions).values(
        changedItems.map((row) => ({
          tenantId,
          warehouseId: count.warehouseId,
          itemId: row.itemId,
          transactionType: 'inventory_adjustment' as const,
          quantity: row.countedQuantity - row.systemQuantity,
          referenceId: count.id,
          referenceType: 'inventory_count',
          performedBy: authUser.id,
          createdAt: now,
        }))
      );
    }

    const [updated] = await db.update(stockInventoryCounts).set({
      status: 'completed',
      completedAt: new Date(),
    }).where(eq(stockInventoryCounts.id, id)).returning();

    return c.json(updated);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/items/scan', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    if (!body.barcode) return c.json({ error: 'barcode is required' }, 400);

    const [count] = await db.select().from(stockInventoryCounts).where(and(
      eq(stockInventoryCounts.id, id),
      eq(stockInventoryCounts.tenantId, tenantId),
    ));
    if (!count) return c.json({ error: 'Inventory count not found' }, 404);

    const [barcode] = await db.select().from(stockBarcodes).where(and(
      eq(stockBarcodes.tenantId, tenantId),
      eq(stockBarcodes.barcode, body.barcode),
    ));
    if (!barcode) return c.json({ error: 'Barcode not found' }, 404);

    const [item] = await db.select().from(stockItems).where(eq(stockItems.id, barcode.itemId));
    return c.json({ barcode, item });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
