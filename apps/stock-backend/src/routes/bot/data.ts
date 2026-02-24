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
    const items = await db.select().from(stockItems)
      .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.isActive, true)));

    const result = await Promise.all(items.map(async (item) => {
      const inv = await db.select().from(stockInventory)
        .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
      const total = inv.reduce((sum, r) => sum + r.quantity, 0);
      return { item_id: item.id, name: item.name, stock: total, unit: item.unit };
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
