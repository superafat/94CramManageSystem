import { Hono } from 'hono';
import { db } from '../../db/index';
import { stockItems, stockWarehouses, stockInventory } from '@94cram/shared/db';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../utils/logger';

type Env = { Variables: { tenantId: string } };
const app = new Hono<Env>();

// POST /data/items
app.post('/items', async (c) => {
  const botBody = c.get('botBody') as { tenant_id?: string } | undefined;
  const tenantId = (c.get('tenantId') as string | undefined) ?? botBody?.tenant_id;

  try {
    if (!tenantId) {
      return c.json({ success: false, error: 'missing_tenant', message: '缺少 tenant_id' }, 400);
    }

    // Production schema does not reliably expose is_active yet, so filter by tenant only.
    const [items, allInventory] = await Promise.all([
      db.select({
        id: stockItems.id,
        name: stockItems.name,
        unit: stockItems.unit,
      }).from(stockItems)
        .where(eq(stockItems.tenantId, tenantId)),
      db.select({
        itemId: stockInventory.itemId,
        quantity: stockInventory.quantity,
      }).from(stockInventory)
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
    logger.error({ err: error instanceof Error ? error : new Error(String(error)), tenantId }, '[bot/data/items] failed');
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /data/warehouses
app.post('/warehouses', async (c) => {
  const botBody = c.get('botBody') as { tenant_id?: string } | undefined;
  const tenantId = (c.get('tenantId') as string | undefined) ?? botBody?.tenant_id;

  try {
    if (!tenantId) {
      return c.json({ success: false, error: 'missing_tenant', message: '缺少 tenant_id' }, 400);
    }

    const warehouses = await db.select({
      id: stockWarehouses.id,
      name: stockWarehouses.name,
      address: stockWarehouses.address,
    }).from(stockWarehouses)
      .where(eq(stockWarehouses.tenantId, tenantId));

    return c.json({
      success: true,
      data: warehouses.map(w => ({ warehouse_id: w.id, name: w.name, address: w.address })),
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)), tenantId }, '[bot/data/warehouses] failed');
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
