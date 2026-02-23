import { Hono } from 'hono';
import { and, desc, eq, gte, inArray, lte, lt, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { stockInventory, stockItems, stockPurchaseItems, stockPurchaseOrders, stockSuppliers, stockTransactions, stockWarehouses } from '../db/schema';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware, getTenantId } from '../middleware/tenant';
import { z } from 'zod';

const app = new Hono();
app.use('*', authMiddleware, tenantMiddleware);
const purchasesQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  ({ from, to }) => !from || !to || from <= to,
  { message: '`from` must be earlier than or equal to `to`' },
);

app.get('/low-stock', async (c) => {
  const tenantId = getTenantId(c);
  const lowStockItems = await db.select({ inventory: stockInventory, item: stockItems, warehouse: stockWarehouses })
    .from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .where(and(eq(stockInventory.tenantId, tenantId), lt(stockInventory.quantity, stockItems.safetyStock)));
  return c.json(lowStockItems);
});

app.get('/summary', async (c) => {
  const tenantId = getTenantId(c);
  const allInventory = await db.select({ inventory: stockInventory, item: stockItems, warehouse: stockWarehouses })
    .from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .where(eq(stockInventory.tenantId, tenantId));

  const byWarehouse: Record<string, { count: number; items: Array<{ itemName: string; quantity: number; safetyStock: number | null }> }> = {};
  allInventory.forEach(({ inventory, item, warehouse }) => {
    if (!byWarehouse[warehouse.name]) byWarehouse[warehouse.name] = { count: 0, items: [] };
    byWarehouse[warehouse.name].count += 1;
    byWarehouse[warehouse.name].items.push({ itemName: item.name, quantity: inventory.quantity, safetyStock: item.safetyStock });
  });

  return c.json({
    totalItems: allInventory.length,
    totalValue: 0,
    lowStockCount: allInventory.filter((row) => row.inventory.quantity <= (row.item.safetyStock || 0)).length,
    byWarehouse,
  });
});

app.get('/reorder-suggestions', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await db.select({
    inventory: stockInventory,
    item: stockItems,
    warehouse: stockWarehouses,
  }).from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .innerJoin(stockWarehouses, eq(stockInventory.warehouseId, stockWarehouses.id))
    .where(and(eq(stockInventory.tenantId, tenantId), lte(stockInventory.quantity, stockItems.safetyStock)));

  return c.json(rows.map((row) => ({
    item: row.item,
    warehouse: row.warehouse,
    currentQty: row.inventory.quantity,
    safetyStock: row.item.safetyStock || 0,
    suggestedQty: Math.max((row.item.safetyStock || 0) * 2 - row.inventory.quantity, 0),
  })));
});

app.get('/dashboard', async (c) => {
  const tenantId = getTenantId(c);
  const sinceToday = new Date();
  sinceToday.setHours(0, 0, 0, 0);
  const sinceMonth = new Date();
  sinceMonth.setDate(1);
  sinceMonth.setHours(0, 0, 0, 0);

  const [allItems, allWarehouses, allInventory, todayTransactions, monthTransactions, recentTransactions, topItems] = await Promise.all([
    db.select().from(stockItems).where(eq(stockItems.tenantId, tenantId)),
    db.select().from(stockWarehouses).where(eq(stockWarehouses.tenantId, tenantId)),
    db.select({ inventory: stockInventory, item: stockItems }).from(stockInventory).innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id)).where(eq(stockInventory.tenantId, tenantId)),
    db.select().from(stockTransactions).where(and(eq(stockTransactions.tenantId, tenantId), gte(stockTransactions.createdAt, sinceToday))),
    db.select().from(stockTransactions).where(and(eq(stockTransactions.tenantId, tenantId), gte(stockTransactions.createdAt, sinceMonth))),
    db.select({ transaction: stockTransactions, item: stockItems, warehouse: stockWarehouses })
      .from(stockTransactions)
      .innerJoin(stockItems, eq(stockTransactions.itemId, stockItems.id))
      .innerJoin(stockWarehouses, eq(stockTransactions.warehouseId, stockWarehouses.id))
      .where(eq(stockTransactions.tenantId, tenantId))
      .orderBy(desc(stockTransactions.createdAt))
      .limit(5),
    db.select({ inventory: stockInventory, item: stockItems })
      .from(stockInventory)
      .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
      .where(eq(stockInventory.tenantId, tenantId))
      .orderBy(desc(stockInventory.quantity))
      .limit(5),
  ]);

  return c.json({
    totalItems: allItems.length,
    totalInventoryValue: 0,
    lowStockCount: allInventory.filter((row) => row.inventory.quantity <= (row.item.safetyStock || 0)).length,
    warehouseCount: allWarehouses.length,
    todayTransactions: todayTransactions.length,
    monthTransactions: monthTransactions.length,
    recentTransactions,
    topItems,
  });
});

app.get('/turnover', async (c) => {
  const tenantId = getTenantId(c);
  const since30Days = new Date();
  since30Days.setDate(since30Days.getDate() - 30);

  const [inventoryRows, outTransactions] = await Promise.all([
    db.select({ inventory: stockInventory, item: stockItems })
      .from(stockInventory)
      .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
      .where(eq(stockInventory.tenantId, tenantId)),
    db.select().from(stockTransactions)
      .where(and(eq(stockTransactions.tenantId, tenantId), gte(stockTransactions.createdAt, since30Days), lt(stockTransactions.quantity, 0))),
  ]);

  const usageByItem = new Map<string, number>();
  outTransactions.forEach((t) => {
    usageByItem.set(t.itemId, (usageByItem.get(t.itemId) || 0) + Math.abs(t.quantity));
  });

  return c.json(inventoryRows.map(({ inventory, item }) => {
    const monthlyOut = usageByItem.get(item.id) || 0;
    const avgDailyUsage = monthlyOut / 30;
    const inventoryDays = avgDailyUsage > 0 ? Number((inventory.quantity / avgDailyUsage).toFixed(2)) : null;
    return {
      itemId: item.id,
      itemName: item.name,
      currentQty: inventory.quantity,
      monthlyOut,
      avgDailyUsage: Number(avgDailyUsage.toFixed(2)),
      inventoryDays,
      isStagnant: monthlyOut === 0,
    };
  }));
});

app.get('/purchases', async (c) => {
  const tenantId = getTenantId(c);
  const parsedQuery = purchasesQuerySchema.safeParse({
    from: c.req.query('from'),
    to: c.req.query('to'),
  });
  if (!parsedQuery.success) {
    return c.json({ error: 'Invalid query parameters' }, 400);
  }
  const { from, to } = parsedQuery.data;

  const conditions: Array<ReturnType<typeof eq> | ReturnType<typeof gte> | ReturnType<typeof lte>> = [
    eq(stockPurchaseOrders.tenantId, tenantId),
    eq(stockPurchaseOrders.status, 'received'),
  ];
  if (from) conditions.push(gte(stockPurchaseOrders.orderDate, from));
  if (to) conditions.push(lte(stockPurchaseOrders.orderDate, to));

  const orders = await db.select().from(stockPurchaseOrders).where(and(...conditions));
  const orderIds = orders.map((order) => order.id);

  if (orderIds.length === 0) {
    return c.json({ totalAmount: 0, bySupplier: [], byItem: [] });
  }

  const [bySupplier, byItem] = await Promise.all([
    db.select({
      supplierId: stockPurchaseOrders.supplierId,
      supplierName: stockSuppliers.name,
      amount: sql<number>`SUM(${stockPurchaseOrders.totalAmount})`,
    })
      .from(stockPurchaseOrders)
      .leftJoin(stockSuppliers, eq(stockPurchaseOrders.supplierId, stockSuppliers.id))
      .where(and(...conditions))
      .groupBy(stockPurchaseOrders.supplierId, stockSuppliers.name),
    db.select({
      itemId: stockPurchaseItems.itemId,
      itemName: stockItems.name,
      quantity: sql<number>`SUM(${stockPurchaseItems.quantity})`,
    })
      .from(stockPurchaseItems)
      .innerJoin(stockItems, eq(stockPurchaseItems.itemId, stockItems.id))
      .where(inArray(stockPurchaseItems.purchaseOrderId, orderIds))
      .groupBy(stockPurchaseItems.itemId, stockItems.name),
  ]);

  const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  return c.json({ totalAmount, bySupplier, byItem });
});

app.get('/promo-stats', async (c) => {
  const tenantId = getTenantId(c);
  const rows = await db.select({
    transaction: stockTransactions,
    item: stockItems,
  }).from(stockTransactions)
    .innerJoin(stockItems, eq(stockTransactions.itemId, stockItems.id))
    .where(and(eq(stockTransactions.tenantId, tenantId), eq(stockTransactions.transactionType, 'promo_out')))
    .orderBy(desc(stockTransactions.createdAt));

  const byRecipient: Record<string, number> = {};
  const byItem: Record<string, number> = {};

  rows.forEach(({ transaction, item }) => {
    const recipient = transaction.recipientName || 'unknown';
    byRecipient[recipient] = (byRecipient[recipient] || 0) + Math.abs(transaction.quantity);
    byItem[item.name] = (byItem[item.name] || 0) + Math.abs(transaction.quantity);
  });

  return c.json({
    records: rows,
    byRecipient: Object.entries(byRecipient).map(([recipient, quantity]) => ({ recipient, quantity })),
    byItem: Object.entries(byItem).map(([itemName, quantity]) => ({ itemName, quantity })),
  });
});

export default app;
