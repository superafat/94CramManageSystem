import { Hono } from 'hono';
import { db } from '../db/index';
import { stockBarcodes, stockInventory, stockTransactions, stockItems, stockWarehouses } from '../db/schema';
import { eq, and, desc, gte, sql } from 'drizzle-orm';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { sendLowStockAlert } from '../services/notifications';
import { z } from 'zod';

const app = new Hono();
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';
const positiveNumber = z.number().positive();
const nonEmptyString = z.string().trim().min(1);
const stockInSchema = z.object({
  warehouseId: nonEmptyString,
  itemId: nonEmptyString.optional(),
  quantity: positiveNumber,
  referenceId: z.string().optional(),
  referenceType: z.string().optional(),
  barcode: z.string().optional()
});
const stockOutSchema = z.object({
  warehouseId: nonEmptyString,
  itemId: nonEmptyString.optional(),
  quantity: positiveNumber,
  transactionType: z.string().optional(),
  referenceId: z.string().optional(),
  recipientName: z.string().optional(),
  recipientNote: z.string().optional(),
  barcode: z.string().optional()
});
const transferSchema = z.object({
  fromWarehouseId: nonEmptyString,
  toWarehouseId: nonEmptyString,
  itemId: nonEmptyString,
  quantity: positiveNumber,
  notes: z.string().optional()
});

app.use('*', tenantMiddleware);

// GET inventory for a warehouse
app.get('/warehouse/:warehouseId', async (c) => {
  const tenantId = getTenantId(c);
  const warehouseId = c.req.param('warehouseId');

  const inventory = await db.select({
    inventory: stockInventory,
    item: stockItems,
    warehouse: stockWarehouses
  })
    .from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .where(and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.warehouseId, warehouseId)
    ));

  return c.json(inventory);
});

// GET all inventory across warehouses
app.get('/', async (c) => {
  const tenantId = getTenantId(c);

  const inventory = await db.select({
    inventory: stockInventory,
    item: stockItems,
    warehouse: stockWarehouses
  })
    .from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .where(eq(stockInventory.tenantId, tenantId));

  return c.json(inventory);
});

// POST stock in (purchase receipt)
app.post('/in', async (c) => {
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
    performedBy: SYSTEM_USER_ID, // TODO: get from auth
    createdAt: new Date()
  });

  return c.json({ message: 'Stock in recorded', quantity });
});

// POST stock out (sale/issue)
app.post('/out', async (c) => {
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

  const [updatedInventory] = await db.update(stockInventory)
    .set({
      quantity: sql`${stockInventory.quantity} - ${quantity}`,
      lastUpdatedAt: new Date()
    })
    .where(and(
      eq(stockInventory.tenantId, tenantId),
      eq(stockInventory.warehouseId, warehouseId),
      eq(stockInventory.itemId, itemId),
      gte(stockInventory.quantity, quantity)
    ))
    .returning();

  if (!updatedInventory) {
    return c.json({ error: 'Insufficient stock' }, 400);
  }

  const remainingQty = updatedInventory.quantity;

  // Record transaction
  await db.insert(stockTransactions).values({
    tenantId,
    warehouseId,
    itemId,
    transactionType: transactionType || 'sale_out',
    quantity: -quantity,
    referenceId,
    recipientName,
    recipientNote,
    performedBy: SYSTEM_USER_ID,
    createdAt: new Date()
  });

  const [item] = await db.select().from(stockItems).where(and(eq(stockItems.id, itemId), eq(stockItems.tenantId, tenantId)));
  const [warehouse] = await db.select().from(stockWarehouses).where(and(eq(stockWarehouses.id, warehouseId), eq(stockWarehouses.tenantId, tenantId)));
  if (item && warehouse && remainingQty <= (item.safetyStock ?? 0)) {
    await sendLowStockAlert(tenantId, { id: item.id, name: item.name, safetyStock: item.safetyStock }, { id: warehouse.id, name: warehouse.name }, remainingQty);
  }

  return c.json({ message: 'Stock out recorded', quantity });
});

// POST transfer between warehouses
app.post('/transfer', async (c) => {
  const tenantId = getTenantId(c);
  const parsedBody = transferSchema.safeParse(await c.req.json());
  if (!parsedBody.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }
  const { fromWarehouseId, toWarehouseId, itemId, quantity, notes } = parsedBody.data;

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
      performedBy: SYSTEM_USER_ID,
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
      performedBy: SYSTEM_USER_ID,
      createdAt: new Date()
    });

    return { transferId };
  });

  if (!transferResult) {
    return c.json({ error: 'Insufficient stock at source warehouse' }, 400);
  }

  return c.json({ message: 'Transfer completed', quantity, transferId: transferResult.transferId });
});

// GET transaction history
app.get('/transactions', async (c) => {
  const tenantId = getTenantId(c);
  const warehouseId = c.req.query('warehouseId');
  const itemId = c.req.query('itemId');

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
    .orderBy(desc(stockTransactions.createdAt));

  return c.json(transactions);
});

export default app;
