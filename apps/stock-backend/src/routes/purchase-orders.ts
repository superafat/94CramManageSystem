import { Hono, type Context } from 'hono';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { stockInventory, stockItems, stockPurchaseItems, stockPurchaseOrders, stockSuppliers, stockTransactions, stockWarehouses } from '@94cram/shared/db';
import { authMiddleware, getAuthUser } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { sendPurchaseApprovalAlert } from '../services/notifications';
import { z } from 'zod';
import { logger } from '../utils/logger';

const uuidParamSchema = z.object({ id: z.string().uuid() });

const purchaseOrderCreateSchema = z.object({
  warehouseId: z.string().uuid(),
  supplierId: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().uuid().optional()),
  orderDate: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().optional()),
  notes: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.string().optional()),
  totalAmount: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.number().optional()),
});

const purchaseItemCreateSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().optional(),
  totalPrice: z.number().optional(),
});

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsed = paginationSchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };

    const orders = await db.select({
      order: stockPurchaseOrders,
      supplierName: stockSuppliers.name,
      warehouseName: stockWarehouses.name,
    }).from(stockPurchaseOrders)
      .leftJoin(stockSuppliers, eq(stockPurchaseOrders.supplierId, stockSuppliers.id))
      .innerJoin(stockWarehouses, eq(stockPurchaseOrders.warehouseId, stockWarehouses.id))
      .where(eq(stockPurchaseOrders.tenantId, tenantId))
      .orderBy(desc(stockPurchaseOrders.createdAt))
      .limit(limit)
      .offset(offset);
    return c.json(orders);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const authUser = getAuthUser(c);
    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const parsed = purchaseOrderCreateSchema.safeParse(requestBody);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    const body = parsed.data;
    const [created] = await db.insert(stockPurchaseOrders).values({
      tenantId,
      warehouseId: body.warehouseId,
      supplierId: body.supplierId,
      status: 'draft',
      orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
      notes: body.notes,
      totalAmount: body.totalAmount?.toString(),
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
    const [order] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!order) return c.json({ error: 'Purchase order not found' }, 404);

    const items = await db.select({ purchaseItem: stockPurchaseItems, item: stockItems })
      .from(stockPurchaseItems)
      .innerJoin(stockItems, eq(stockPurchaseItems.itemId, stockItems.id))
      .where(eq(stockPurchaseItems.purchaseOrderId, id));

    return c.json({ ...order, items });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/:id', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const body = await c.req.json();
    const [existing] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!existing) return c.json({ error: 'Purchase order not found' }, 404);
    if (existing.status !== 'draft') return c.json({ error: 'Only draft order can be edited' }, 400);

    const [updated] = await db.update(stockPurchaseOrders).set({
      warehouseId: body.warehouseId,
      supplierId: body.supplierId,
      orderDate: body.orderDate ? new Date(body.orderDate) : existing.orderDate,
      notes: body.notes,
      totalAmount: body.totalAmount,
    }).where(eq(stockPurchaseOrders.id, id)).returning();
    return c.json(updated);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/submit', async (c) => {
  try {
    const updated = await updateStatus(c, 'draft', 'pending');
    if (updated.status === 200) {
      const tenantId = getTenantId(c);
      const id = c.req.param('id');
      const [order] = await db.select({
        order: stockPurchaseOrders,
        supplierName: stockSuppliers.name,
        warehouseName: stockWarehouses.name,
      }).from(stockPurchaseOrders)
        .leftJoin(stockSuppliers, eq(stockPurchaseOrders.supplierId, stockSuppliers.id))
        .innerJoin(stockWarehouses, eq(stockPurchaseOrders.warehouseId, stockWarehouses.id))
        .where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
      if (order) {
        await sendPurchaseApprovalAlert(tenantId, {
          id: order.order.id,
          supplierName: order.supplierName,
          warehouseName: order.warehouseName,
          totalAmount: order.order.totalAmount,
        });
      }
    }
    return updated;
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/approve', async (c) => {
  try {
    if (getAuthUser(c).role !== 'admin') return c.json({ error: 'Forbidden' }, 403);
    return updateStatus(c, 'pending', 'approved');
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/receive', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const authUser = getAuthUser(c);

    const [order] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!order) return c.json({ error: 'Purchase order not found' }, 404);
    if (order.status !== 'approved') return c.json({ error: 'Only approved order can be received' }, 400);

    const poItems = await db.select().from(stockPurchaseItems).where(eq(stockPurchaseItems.purchaseOrderId, id));

    // Batch upsert inventory and collect transaction records
    const now = new Date();
    for (const poItem of poItems) {
      await db.insert(stockInventory).values({
        tenantId,
        warehouseId: order.warehouseId,
        itemId: poItem.itemId,
        quantity: poItem.quantity,
        lastUpdatedAt: now,
      }).onConflictDoUpdate({
        target: [stockInventory.warehouseId, stockInventory.itemId],
        set: {
          quantity: sql`${stockInventory.quantity} + ${poItem.quantity}`,
          lastUpdatedAt: now,
        },
      });
    }

    if (poItems.length > 0) {
      await db.insert(stockTransactions).values(
        poItems.map((poItem) => ({
          tenantId,
          warehouseId: order.warehouseId,
          itemId: poItem.itemId,
          transactionType: 'purchase_in' as const,
          quantity: poItem.quantity,
          referenceId: order.id,
          referenceType: 'purchase_order',
          performedBy: authUser.id,
          createdAt: now,
        }))
      );
    }

    const [updated] = await db.update(stockPurchaseOrders).set({ status: 'received', receivedDate: now }).where(eq(stockPurchaseOrders.id, id)).returning();
    return c.json(updated);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/cancel', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const [existing] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!existing) return c.json({ error: 'Purchase order not found' }, 404);
    const [updated] = await db.update(stockPurchaseOrders).set({ status: 'cancelled' }).where(eq(stockPurchaseOrders.id, id)).returning();
    return c.json(updated);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/:id/items', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedParams = uuidParamSchema.safeParse({ id: c.req.param('id') });
    if (!parsedParams.success) {
      return c.json({ error: 'Invalid purchase order id' }, 400);
    }
    const { id } = parsedParams.data;
    let requestBody: unknown;
    try {
      requestBody = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }
    const parsed = purchaseItemCreateSchema.safeParse(requestBody);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    const body = parsed.data;
    const [order] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!order) return c.json({ error: 'Purchase order not found' }, 404);
    if (order.status !== 'draft') return c.json({ error: 'Only draft order can be edited' }, 400);

    const [created] = await db.insert(stockPurchaseItems).values({
      purchaseOrderId: id,
      itemId: body.itemId,
      quantity: body.quantity,
      unitPrice: body.unitPrice?.toString(),
      totalPrice: body.totalPrice?.toString(),
    }).returning();
    return c.json(created, 201);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/:id/items/:itemId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const id = c.req.param('id');
    const itemId = c.req.param('itemId');
    const [order] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
    if (!order) return c.json({ error: 'Purchase order not found' }, 404);
    if (order.status !== 'draft') return c.json({ error: 'Only draft order can be edited' }, 400);

    const [deleted] = await db.delete(stockPurchaseItems).where(and(eq(stockPurchaseItems.purchaseOrderId, id), eq(stockPurchaseItems.itemId, itemId))).returning();
    if (!deleted) return c.json({ error: 'Purchase item not found' }, 404);
    return c.json({ message: 'Purchase item deleted' });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

async function updateStatus(c: Context, fromStatus: string, toStatus: string) {
  const tenantId = getTenantId(c);
  const id = c.req.param('id');
  const [existing] = await db.select().from(stockPurchaseOrders).where(and(eq(stockPurchaseOrders.id, id), eq(stockPurchaseOrders.tenantId, tenantId)));
  if (!existing) return c.json({ error: 'Purchase order not found' }, 404);
  if (existing.status !== fromStatus) return c.json({ error: `Only ${fromStatus} order can be changed` }, 400);
  const [updated] = await db.update(stockPurchaseOrders).set({ status: toStatus }).where(eq(stockPurchaseOrders.id, id)).returning();
  return c.json(updated);
}

export default app;
