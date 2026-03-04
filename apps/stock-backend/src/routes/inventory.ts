import { Hono } from 'hono';
import { db } from '../db/index';
import { stockBarcodes, stockInventory, stockTransactions, stockItems, stockWarehouses, stockCategories } from '@94cram/shared/db';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { sendLowStockAlert } from '../services/notifications';
import { z } from 'zod';
import { logger } from '../utils/logger';

const app = new Hono();
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

/** Return authenticated user ID if available, otherwise fall back to SYSTEM_USER_ID */
function getPerformer(c: { var: Record<string, unknown> }): string {
  const authUser = c.var['authUser'] as { id?: string } | undefined;
  return authUser?.id || SYSTEM_USER_ID;
}

const positiveInteger = z.number().int().positive();
const nonEmptyString = z.string().trim().min(1);
const uuidString = z.string().uuid();
const optionalUuid = z.string().uuid().optional();
const stockInSchema = z.object({
  warehouseId: uuidString,
  itemId: uuidString.optional(),
  quantity: positiveInteger,
  referenceId: optionalUuid,
  referenceType: z.string().optional(),
  barcode: z.string().optional()
});
const stockOutSchema = z.object({
  warehouseId: uuidString,
  itemId: uuidString.optional(),
  quantity: positiveInteger,
  transactionType: z.string().optional(),
  referenceId: optionalUuid,
  recipientName: z.string().optional(),
  recipientNote: z.string().optional(),
  barcode: z.string().optional()
});
const transferSchema = z.object({
  fromWarehouseId: uuidString,
  toWarehouseId: uuidString,
  itemId: uuidString,
  quantity: positiveInteger,
  notes: z.string().optional()
}).refine(
  (data) => data.fromWarehouseId !== data.toWarehouseId,
  { message: 'Source and destination warehouse must be different' }
);
const transactionQuerySchema = z.object({
  warehouseId: uuidString.optional(),
  itemId: uuidString.optional(),
});
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// suppress unused variable warning
void nonEmptyString;

app.use('*', authMiddleware, tenantMiddleware);

// 聯動叫貨建議 — 按分類分組低庫存品項
app.get('/low-stock-by-category', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const rows = await db.select({
      inventoryId: stockInventory.id,
      itemId: stockItems.id,
      itemName: stockItems.name,
      sku: stockItems.sku,
      unit: stockItems.unit,
      warehouseId: stockWarehouses.id,
      warehouseName: stockWarehouses.name,
      quantity: stockInventory.quantity,
      safetyStock: stockItems.safetyStock,
      categoryId: stockCategories.id,
      categoryName: stockCategories.name,
      categoryColor: stockCategories.color,
      restockLeadDays: stockCategories.restockLeadDays,
      minOrderQuantity: stockCategories.minOrderQuantity,
    })
    .from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .leftJoin(stockCategories, eq(stockItems.categoryId, stockCategories.id))
    .where(eq(stockInventory.tenantId, tenantId));

    // Filter to low-stock items and group by category
    const lowStock = rows.filter(r => r.quantity <= (r.safetyStock ?? 0));
    const grouped = new Map<string, { categoryName: string; categoryColor: string | null; restockLeadDays: number | null; minOrderQuantity: number | null; items: typeof lowStock }>();

    for (const item of lowStock) {
      const key = item.categoryId || 'uncategorized';
      if (!grouped.has(key)) {
        grouped.set(key, {
          categoryName: item.categoryName || '未分類',
          categoryColor: item.categoryColor,
          restockLeadDays: item.restockLeadDays,
          minOrderQuantity: item.minOrderQuantity,
          items: [],
        });
      }
      grouped.get(key)!.items.push(item);
    }

    const result = Array.from(grouped.entries()).map(([categoryId, group]) => ({
      categoryId,
      categoryName: group.categoryName,
      categoryColor: group.categoryColor,
      restockLeadDays: group.restockLeadDays ?? 7,
      minOrderQuantity: group.minOrderQuantity ?? 1,
      items: group.items.map(i => ({
        itemId: i.itemId,
        itemName: i.itemName,
        sku: i.sku,
        unit: i.unit,
        warehouseId: i.warehouseId,
        warehouseName: i.warehouseName,
        quantity: i.quantity,
        safetyStock: i.safetyStock ?? 0,
        suggestedQty: Math.max(1, (i.safetyStock ?? 0) * 2 - i.quantity),
      })),
    }));

    return c.json(result);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET inventory for a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const warehouseId = c.req.param('warehouseId');
    const parsed = paginationSchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };

    const inventory = await db.select({
      inventory: stockInventory,
      item: stockItems,
      warehouse: stockWarehouses,
      category: { id: stockCategories.id, name: stockCategories.name, color: stockCategories.color, restockLeadDays: stockCategories.restockLeadDays, minOrderQuantity: stockCategories.minOrderQuantity }
    })
      .from(stockInventory)
      .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
      .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
      .leftJoin(stockCategories, eq(stockItems.categoryId, stockCategories.id))
      .where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, warehouseId)
      ))
      .limit(limit)
      .offset(offset);

    return c.json(inventory);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET all inventory across warehouses
app.get('/', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsed = paginationSchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };

    const inventory = await db.select({
      inventory: stockInventory,
      item: stockItems,
      warehouse: stockWarehouses,
      category: { id: stockCategories.id, name: stockCategories.name, color: stockCategories.color, restockLeadDays: stockCategories.restockLeadDays, minOrderQuantity: stockCategories.minOrderQuantity }
    })
      .from(stockInventory)
      .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
      .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
      .leftJoin(stockCategories, eq(stockItems.categoryId, stockCategories.id))
      .where(eq(stockInventory.tenantId, tenantId))
      .limit(limit)
      .offset(offset);

    return c.json(inventory);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST stock in (purchase receipt)
app.post('/in', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedBody = stockInSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }

    const { warehouseId, quantity, referenceId, referenceType, barcode } = parsedBody.data;
    let itemId = parsedBody.data.itemId;

    if (!itemId && typeof barcode === 'string' && barcode.trim()) {
      const [barcodeRow] = await db.select().from(stockBarcodes).where(and(
        eq(stockBarcodes.tenantId, tenantId),
        eq(stockBarcodes.barcode, barcode.trim()),
      ));
      itemId = barcodeRow?.itemId;
    }

    if (!itemId) {
      return c.json({ error: 'Invalid input' }, 400);
    }

    await db.insert(stockInventory).values({
      tenantId,
      warehouseId,
      itemId,
      quantity,
      lastUpdatedAt: new Date()
    }).onConflictDoUpdate({
      target: [stockInventory.warehouseId, stockInventory.itemId],
      set: {
        quantity: sql`${stockInventory.quantity} + ${quantity}`,
        lastUpdatedAt: new Date()
      }
    });

    // Record transaction
    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId,
      itemId,
      transactionType: 'purchase_in',
      quantity,
      referenceId,
      referenceType,
      performedBy: getPerformer(c),
      createdAt: new Date()
    });

    return c.json({ message: 'Stock in recorded', quantity });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST stock out (sale/issue)
app.post('/out', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedBody = stockOutSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }

    const { warehouseId, quantity, transactionType, referenceId, recipientName, recipientNote, barcode } = parsedBody.data;
    let itemId = parsedBody.data.itemId;

    if (!itemId && typeof barcode === 'string' && barcode.trim()) {
      const [barcodeRow] = await db.select().from(stockBarcodes).where(and(
        eq(stockBarcodes.tenantId, tenantId),
        eq(stockBarcodes.barcode, barcode.trim()),
      ));
      itemId = barcodeRow?.itemId;
    }

    if (!itemId) {
      return c.json({ error: 'Invalid input' }, 400);
    }

    const stockOutResult = await db.transaction(async (tx) => {
      const [updatedInventory] = await tx.update(stockInventory)
        .set({
          quantity: sql`${stockInventory.quantity} - ${quantity}`,
          lastUpdatedAt: new Date()
        })
        .where(and(
          eq(stockInventory.tenantId, tenantId),
          eq(stockInventory.warehouseId, warehouseId),
          eq(stockInventory.itemId, itemId!),
          gte(stockInventory.quantity, quantity)
        ))
        .returning();

      if (!updatedInventory) {
        return null;
      }

      await tx.insert(stockTransactions).values({
        tenantId,
        warehouseId,
        itemId: itemId!,
        transactionType: transactionType || 'sale_out',
        quantity: -quantity,
        referenceId,
        recipientName,
        recipientNote,
        performedBy: getPerformer(c),
        createdAt: new Date()
      });

      return { remainingQty: updatedInventory.quantity };
    });

    if (!stockOutResult) {
      return c.json({ error: 'Insufficient stock' }, 400);
    }

    const remainingQty = stockOutResult.remainingQty;

    const [item] = await db.select().from(stockItems).where(and(eq(stockItems.id, itemId), eq(stockItems.tenantId, tenantId)));
    const [warehouse] = await db.select().from(stockWarehouses).where(and(eq(stockWarehouses.id, warehouseId), eq(stockWarehouses.tenantId, tenantId)));
    if (item && warehouse && remainingQty <= (item.safetyStock ?? 0)) {
      await sendLowStockAlert(tenantId, { id: item.id, name: item.name, safetyStock: item.safetyStock }, { id: warehouse.id, name: warehouse.name }, remainingQty);
    }

    return c.json({ message: 'Stock out recorded', quantity });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// POST transfer between warehouses
app.post('/transfer', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedBody = transferSchema.safeParse(await c.req.json());
    if (!parsedBody.success) {
      return c.json({ error: 'Invalid input' }, 400);
    }
    const { fromWarehouseId, toWarehouseId, itemId, quantity, notes } = parsedBody.data;

    // suppress unused variable warning
    void notes;

    const transferResult = await db.transaction(async (tx) => {
      const [sourceInventory] = await tx.update(stockInventory)
        .set({
          quantity: sql`${stockInventory.quantity} - ${quantity}`,
          lastUpdatedAt: new Date()
        })
        .where(and(
          eq(stockInventory.tenantId, tenantId),
          eq(stockInventory.warehouseId, fromWarehouseId),
          eq(stockInventory.itemId, itemId),
          gte(stockInventory.quantity, quantity)
        ))
        .returning();

      if (!sourceInventory) {
        return null;
      }

      await tx.insert(stockInventory).values({
        tenantId,
        warehouseId: toWarehouseId,
        itemId,
        quantity,
        lastUpdatedAt: new Date()
      }).onConflictDoUpdate({
        target: [stockInventory.warehouseId, stockInventory.itemId],
        set: {
          quantity: sql`${stockInventory.quantity} + ${quantity}`,
          lastUpdatedAt: new Date()
        }
      });

      const transferId = crypto.randomUUID();
      await tx.insert(stockTransactions).values({
        tenantId,
        warehouseId: fromWarehouseId,
        itemId,
        transactionType: 'transfer_out',
        quantity: -quantity,
        referenceId: transferId,
        referenceType: 'transfer',
        performedBy: getPerformer(c),
        createdAt: new Date()
      });

      await tx.insert(stockTransactions).values({
        tenantId,
        warehouseId: toWarehouseId,
        itemId,
        transactionType: 'transfer_in',
        quantity,
        referenceId: transferId,
        referenceType: 'transfer',
        performedBy: getPerformer(c),
        createdAt: new Date()
      });

      return { transferId };
    });

    if (!transferResult) {
      return c.json({ error: 'Insufficient stock at source warehouse' }, 400);
    }

    return c.json({ message: 'Transfer completed', quantity, transferId: transferResult.transferId });
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET transaction history
app.get('/transactions', async (c) => {
  try {
    const tenantId = getTenantId(c);
    const parsedQuery = transactionQuerySchema.safeParse({
      warehouseId: c.req.query('warehouseId'),
      itemId: c.req.query('itemId'),
    });

    if (!parsedQuery.success) {
      return c.json({ error: 'Invalid query parameters' }, 400);
    }

    const parsed = paginationSchema.safeParse({
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    });
    const { limit, offset } = parsed.success ? parsed.data : { limit: 50, offset: 0 };

    const { warehouseId, itemId } = parsedQuery.data;

    const conditions = [eq(stockTransactions.tenantId, tenantId)];

    if (warehouseId) {
      conditions.push(eq(stockTransactions.warehouseId, warehouseId));
    }
    if (itemId) {
      conditions.push(eq(stockTransactions.itemId, itemId));
    }

    const transactions = await db.select({
      transaction: stockTransactions,
      item: stockItems,
      warehouse: stockWarehouses
    })
      .from(stockTransactions)
      .innerJoin(stockItems, eq(stockTransactions.itemId, stockItems.id))
      .innerJoin(stockWarehouses, eq(stockTransactions.warehouseId, stockWarehouses.id))
      .where(and(...conditions))
      .orderBy(desc(stockTransactions.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json(transactions);
  } catch (err) {
    logger.error({ err }, 'Route error');
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
