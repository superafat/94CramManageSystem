import { Hono } from 'hono';
import { db } from '../db/index';
import { stockBatches, stockInventory, stockItems, stockWarehouses } from '@94cram/shared/db';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);

const uuidString = z.string().uuid();
const optionalUuid = z.string().uuid().optional();

const batchCreateSchema = z.object({
  warehouseId: uuidString,
  itemId: uuidString,
  batchNo: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  manufactureDate: z.string().optional(),
  expiryDate: z.string().optional(),
  unitCost: z.number().nonnegative().optional(),
  purchaseOrderId: optionalUuid,
  notes: z.string().optional(),
});

const batchConsumeSchema = z.object({
  warehouseId: uuidString,
  itemId: uuidString,
  quantity: z.number().int().positive(),
});

const batchListQuerySchema = z.object({
  itemId: uuidString.optional(),
  warehouseId: uuidString.optional(),
});

// GET /expiry-report — 過期報表
app.get('/expiry-report', async (c) => {
  const tenantId = getTenantId(c);

  const rows = await db
    .select({
      id: stockBatches.id,
      batchNo: stockBatches.batchNo,
      quantity: stockBatches.quantity,
      remainingQty: stockBatches.remainingQty,
      manufactureDate: stockBatches.manufactureDate,
      expiryDate: stockBatches.expiryDate,
      receivedAt: stockBatches.receivedAt,
      unitCost: stockBatches.unitCost,
      notes: stockBatches.notes,
      itemName: stockItems.name,
      sku: stockItems.sku,
      warehouseName: stockWarehouses.name,
      daysUntilExpiry: sql<number>`EXTRACT(DAY FROM ${stockBatches.expiryDate} - NOW())`,
    })
    .from(stockBatches)
    .innerJoin(stockItems, eq(stockBatches.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockBatches.warehouseId, stockWarehouses.id))
    .where(
      and(
        eq(stockBatches.tenantId, tenantId),
        gt(stockBatches.remainingQty, 0)
      )
    )
    .orderBy(sql`${stockBatches.expiryDate} ASC NULLS LAST`);

  // 分組統計
  const expired: typeof rows = [];
  const expiringSoon: typeof rows = [];
  const normal: typeof rows = [];

  for (const row of rows) {
    if (row.expiryDate === null) {
      normal.push(row);
      continue;
    }
    const days = Number(row.daysUntilExpiry);
    if (days < 0) {
      expired.push(row);
    } else if (days <= 30) {
      expiringSoon.push(row);
    } else {
      normal.push(row);
    }
  }

  return c.json({
    summary: {
      expiredCount: expired.length,
      expiringSoonCount: expiringSoon.length,
      normalCount: normal.length,
      totalCount: rows.length,
    },
    expired,
    expiringSoon,
    normal,
  });
});

// GET / — 批次列表（支援 ?itemId= 和 ?warehouseId= 篩選）
app.get('/', async (c) => {
  const tenantId = getTenantId(c);

  const parsedQuery = batchListQuerySchema.safeParse({
    itemId: c.req.query('itemId'),
    warehouseId: c.req.query('warehouseId'),
  });

  if (!parsedQuery.success) {
    return c.json({ error: 'Invalid query parameters' }, 400);
  }

  const { itemId, warehouseId } = parsedQuery.data;

  const conditions = [
    eq(stockBatches.tenantId, tenantId),
    gt(stockBatches.remainingQty, 0),
  ];

  if (itemId) {
    conditions.push(eq(stockBatches.itemId, itemId));
  }
  if (warehouseId) {
    conditions.push(eq(stockBatches.warehouseId, warehouseId));
  }

  const batches = await db
    .select({
      batch: stockBatches,
      itemName: stockItems.name,
      sku: stockItems.sku,
      warehouseName: stockWarehouses.name,
    })
    .from(stockBatches)
    .innerJoin(stockItems, eq(stockBatches.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockBatches.warehouseId, stockWarehouses.id))
    .where(and(...conditions))
    .orderBy(sql`${stockBatches.receivedAt} DESC`);

  return c.json(batches);
});

// POST / — 新增批次（入庫時建立）
app.post('/', async (c) => {
  const tenantId = getTenantId(c);

  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = batchCreateSchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const {
    warehouseId,
    itemId,
    batchNo,
    quantity,
    manufactureDate,
    expiryDate,
    unitCost,
    purchaseOrderId,
    notes,
  } = parsed.data;

  const result = await db.transaction(async (tx) => {
    // INSERT 到 stock_batches，remainingQty = quantity
    const [batch] = await tx
      .insert(stockBatches)
      .values({
        tenantId,
        warehouseId,
        itemId,
        batchNo,
        quantity,
        remainingQty: quantity,
        manufactureDate: manufactureDate ? new Date(manufactureDate) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        unitCost: unitCost !== undefined ? unitCost.toString() : undefined,
        purchaseOrderId,
        notes,
        receivedAt: new Date(),
      })
      .returning();

    // 更新 stock_inventory 的 quantity（加上入庫數量）
    await tx
      .insert(stockInventory)
      .values({
        tenantId,
        warehouseId,
        itemId,
        quantity,
        lastUpdatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stockInventory.warehouseId, stockInventory.itemId],
        set: {
          quantity: sql`${stockInventory.quantity} + ${quantity}`,
          lastUpdatedAt: new Date(),
        },
      });

    return batch;
  });

  return c.json(result, 201);
});

// POST /consume — 批次消耗（出庫時 FIFO）
app.post('/consume', async (c) => {
  const tenantId = getTenantId(c);

  let requestBody: unknown;
  try {
    requestBody = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = batchConsumeSchema.safeParse(requestBody);
  if (!parsed.success) {
    return c.json({ error: 'Invalid input', details: parsed.error.flatten() }, 400);
  }

  const { warehouseId, itemId, quantity } = parsed.data;

  const consumeResult = await db.transaction(async (tx) => {
    // 先進先出：按 received_at ASC 取批次
    const availableBatches = await tx
      .select({
        id: stockBatches.id,
        remainingQty: stockBatches.remainingQty,
        batchNo: stockBatches.batchNo,
      })
      .from(stockBatches)
      .where(
        and(
          eq(stockBatches.tenantId, tenantId),
          eq(stockBatches.warehouseId, warehouseId),
          eq(stockBatches.itemId, itemId),
          gt(stockBatches.remainingQty, 0)
        )
      )
      .orderBy(asc(stockBatches.receivedAt));

    // 確認總量是否足夠
    const totalAvailable = availableBatches.reduce((sum, b) => sum + b.remainingQty, 0);
    if (totalAvailable < quantity) {
      return { success: false as const, totalAvailable };
    }

    // 逐筆扣減直到滿足需求量
    let remaining = quantity;
    const consumed: Array<{ batchId: string; batchNo: string; deducted: number }> = [];

    for (const batch of availableBatches) {
      if (remaining <= 0) break;

      const deducted = Math.min(batch.remainingQty, remaining);
      remaining -= deducted;

      await tx
        .update(stockBatches)
        .set({ remainingQty: batch.remainingQty - deducted })
        .where(eq(stockBatches.id, batch.id));

      consumed.push({ batchId: batch.id, batchNo: batch.batchNo, deducted });
    }

    return { success: true as const, consumed };
  });

  if (!consumeResult.success) {
    return c.json(
      {
        error: 'Insufficient batch stock',
        available: consumeResult.totalAvailable,
        requested: quantity,
      },
      400
    );
  }

  return c.json({
    message: 'Batch consumption recorded',
    quantity,
    consumed: consumeResult.consumed,
  });
});

export default app;
