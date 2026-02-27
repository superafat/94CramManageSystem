import { Hono } from 'hono';
import { db } from '../../db/index';
import { stockItems, stockWarehouses, stockInventory } from '@94cram/shared/db';
import { eq, and } from 'drizzle-orm';

type Env = { Variables: { tenantId: string } };
const app = new Hono<Env>();

// POST /data/items
app.post('/items', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string;

    // 批次查詢：一次取得所有 items 和 inventory，避免 N+1 查詢
    const [items, allInventory] = await Promise.all([
      db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.isActive, true))),
      db.select().from(stockInventory)
        .where(eq(stockInventory.tenantId, tenantId)),
    ]);

    // 在記憶體中依 itemId 加總庫存
    const stockByItemId = new Map<string, number>();
    for (const inv of allInventory) {
      stockByItemId.set(inv.itemId, (stockByItemId.get(inv.itemId) ?? 0) + inv.quantity);
    }

    const result = items.map((item) => ({
      item_id: item.id,
      name: item.name,
      stock: stockByItemId.get(item.id) ?? 0,
      unit: item.unit,
    }));

    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/warehouses
app.post('/warehouses', async (c) => {
  try {
    const tenantId = c.get('tenantId') as string;
    const warehouses = await db.select().from(stockWarehouses)
      .where(eq(stockWarehouses.tenantId, tenantId));

    return c.json({
      success: true,
      data: warehouses.map(w => ({ warehouse_id: w.id, name: w.name, address: w.address })),
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
