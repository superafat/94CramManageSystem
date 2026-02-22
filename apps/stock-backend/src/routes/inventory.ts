import { Hono } from 'hono';
import { db } from '../db/index';
import { stockBarcodes, stockInventory, stockTransactions, stockItems, stockWarehouses } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { sendLowStockAlert } from '../services/notifications';

const app = new Hono();

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
  const body = await c.req.json();
  
  const { warehouseId, quantity, referenceId, referenceType, barcode } = body;
  let itemId = body.itemId as string | undefined;

  if (!itemId && typeof barcode === 'string' && barcode.trim()) {
    const [barcodeRow] = await db.select().from(stockBarcodes).where(and(
      eq(stockBarcodes.tenantId, tenantId),
      eq(stockBarcodes.barcode, barcode.trim()),
    ));
    itemId = barcodeRow?.itemId;
  }

  if (!warehouseId || !itemId || !quantity || quantity <= 0) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  // Update or create inventory record
  const [existing] = await db.select()
    .from(stockInventory)
      .where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, warehouseId),
        eq(stockInventory.itemId, itemId)
      ));

  if (existing) {
    await db.update(stockInventory)
      .set({ 
        quantity: existing.quantity + quantity,
        lastUpdatedAt: new Date()
      })
      .where(eq(stockInventory.id, existing.id));
  } else {
    await db.insert(stockInventory).values({
      tenantId,
      warehouseId,
      itemId,
      quantity,
      lastUpdatedAt: new Date()
    });
  }

  // Record transaction
  await db.insert(stockTransactions).values({
    tenantId,
    warehouseId,
    itemId,
    transactionType: 'purchase_in',
    quantity,
    referenceId,
    referenceType,
    performedBy: 'system', // TODO: get from auth
    createdAt: new Date()
  });

  return c.json({ message: 'Stock in recorded', quantity });
});

// POST stock out (sale/issue)
app.post('/out', async (c) => {
  const tenantId = getTenantId(c);
  const body = await c.req.json();
  
  const { warehouseId, quantity, transactionType, referenceId, recipientName, recipientNote, barcode } = body;
  let itemId = body.itemId as string | undefined;

  if (!itemId && typeof barcode === 'string' && barcode.trim()) {
    const [barcodeRow] = await db.select().from(stockBarcodes).where(and(
      eq(stockBarcodes.tenantId, tenantId),
      eq(stockBarcodes.barcode, barcode.trim()),
    ));
    itemId = barcodeRow?.itemId;
  }

  if (!warehouseId || !itemId || !quantity || quantity <= 0) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  // Check current stock
  const [inventory] = await db.select()
    .from(stockInventory)
      .where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, warehouseId),
        eq(stockInventory.itemId, itemId)
      ));

  if (!inventory || inventory.quantity < quantity) {
    return c.json({ error: 'Insufficient stock' }, 400);
  }

  // Update inventory
  await db.update(stockInventory)
    .set({ 
      quantity: inventory.quantity - quantity,
      lastUpdatedAt: new Date()
    })
    .where(eq(stockInventory.id, inventory.id));

  const remainingQty = inventory.quantity - quantity;

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
    performedBy: 'system',
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
  const body = await c.req.json();
  
  const { fromWarehouseId, toWarehouseId, itemId, quantity, notes } = body;

  if (!fromWarehouseId || !toWarehouseId || !itemId || !quantity || quantity <= 0) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  // Check source stock
  const [sourceInventory] = await db.select()
    .from(stockInventory)
      .where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, fromWarehouseId),
        eq(stockInventory.itemId, itemId)
      ));

  if (!sourceInventory || sourceInventory.quantity < quantity) {
    return c.json({ error: 'Insufficient stock at source warehouse' }, 400);
  }

  // Deduct from source
  await db.update(stockInventory)
    .set({ 
      quantity: sourceInventory.quantity - quantity,
      lastUpdatedAt: new Date()
    })
    .where(eq(stockInventory.id, sourceInventory.id));

  // Add to destination
  const [destInventory] = await db.select()
    .from(stockInventory)
      .where(and(
        eq(stockInventory.tenantId, tenantId),
        eq(stockInventory.warehouseId, toWarehouseId),
        eq(stockInventory.itemId, itemId)
      ));

  if (destInventory) {
    await db.update(stockInventory)
      .set({ 
        quantity: destInventory.quantity + quantity,
        lastUpdatedAt: new Date()
      })
      .where(eq(stockInventory.id, destInventory.id));
  } else {
    await db.insert(stockInventory).values({
      tenantId,
      warehouseId: toWarehouseId,
      itemId,
      quantity,
      lastUpdatedAt: new Date()
    });
  }

  // Record transactions
  const transferId = crypto.randomUUID();
  
  await db.insert(stockTransactions).values({
    tenantId,
    warehouseId: fromWarehouseId,
    itemId,
    transactionType: 'transfer_out',
    quantity: -quantity,
    referenceId: transferId,
    referenceType: 'transfer',
    performedBy: 'system',
    createdAt: new Date()
  });

  await db.insert(stockTransactions).values({
    tenantId,
    warehouseId: toWarehouseId,
    itemId,
    transactionType: 'transfer_in',
    quantity,
    referenceId: transferId,
    referenceType: 'transfer',
    performedBy: 'system',
    createdAt: new Date()
  });

  return c.json({ message: 'Transfer completed', quantity, transferId });
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
