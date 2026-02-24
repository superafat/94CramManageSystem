import { Hono } from 'hono';
import { db } from '../../db/index';
import { stockItems, stockWarehouses, stockInventory, stockTransactions } from '@94cram/shared/db';
import { eq, and, like } from 'drizzle-orm';

type Env = { Variables: { tenantId: string } };
const app = new Hono<Env>();

// POST /stock/ship
app.post('/ship', async (c) => {
  try {
    const { item_name, item_id, quantity, destination, destination_id } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.name, item_name)));
    }

    if (items.length === 0) {
      const suggestions = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'item_not_found',
        message: `找不到品項「${item_name}」`,
        suggestions: suggestions.map(i => ({ item_id: i.id, name: i.name })),
      });
    }

    const item = items[0];

    let warehouses;
    if (destination_id) {
      warehouses = await db.select().from(stockWarehouses)
        .where(and(eq(stockWarehouses.tenantId, tenantId), eq(stockWarehouses.id, destination_id)));
    } else {
      warehouses = await db.select().from(stockWarehouses)
        .where(and(eq(stockWarehouses.tenantId, tenantId), like(stockWarehouses.name, `%${destination}%`)));
    }

    if (warehouses.length === 0) {
      const allWarehouses = await db.select().from(stockWarehouses)
        .where(eq(stockWarehouses.tenantId, tenantId));
      return c.json({
        success: false, error: 'warehouse_not_found',
        message: `找不到目的地「${destination}」`,
        suggestions: allWarehouses.map(w => ({ warehouse_id: w.id, name: w.name })),
      });
    }

    const warehouse = warehouses[0];

    const inventoryRows = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
    const totalStock = inventoryRows.reduce((sum, r) => sum + r.quantity, 0);

    if (totalStock < quantity) {
      return c.json({
        success: false, error: 'insufficient_stock',
        message: `庫存不足：${item.name} 目前只剩 ${totalStock} ${item.unit}，無法出貨 ${quantity} ${item.unit}`,
        data: { item_name: item.name, current_stock: totalStock, requested: quantity },
      });
    }

    const existingInventory = inventoryRows.find(r => r.warehouseId === warehouse.id);
    if (existingInventory) {
      await db.update(stockInventory)
        .set({ quantity: existingInventory.quantity - quantity, lastUpdatedAt: new Date() })
        .where(eq(stockInventory.id, existingInventory.id));
    }

    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId: warehouse.id,
      itemId: item.id,
      transactionType: 'out',
      quantity: -quantity,
      recipientName: warehouse.name,
      recipientNote: '由 94CramBot 出貨',
      performedBy: '00000000-0000-0000-0000-000000000000',
    });

    return c.json({
      success: true,
      message: `已出貨：${item.name} ${quantity}${item.unit} → ${warehouse.name}`,
      data: {
        item_name: item.name,
        quantity_shipped: quantity,
        stock_before: totalStock,
        stock_after: totalStock - quantity,
        destination: warehouse.name,
      },
    });
  } catch (error) {
    console.error('[Bot] ship error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /stock/restock
app.post('/restock', async (c) => {
  try {
    const { item_name, item_id, quantity } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.name, item_name)));
    }

    if (items.length === 0) {
      const suggestions = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)))
        .limit(5);
      return c.json({
        success: false, error: 'item_not_found',
        message: `找不到品項「${item_name}」`,
        suggestions: suggestions.map(i => ({ item_id: i.id, name: i.name })),
      });
    }

    const item = items[0];

    const hqWarehouse = await db.select().from(stockWarehouses)
      .where(and(eq(stockWarehouses.tenantId, tenantId), eq(stockWarehouses.isHeadquarters, true)))
      .limit(1);

    const warehouseId = hqWarehouse[0]?.id;
    if (!warehouseId) {
      return c.json({ success: false, error: 'no_warehouse', message: '找不到總部倉庫' });
    }

    const existing = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id), eq(stockInventory.warehouseId, warehouseId)))
      .limit(1);

    const stockBefore = existing[0]?.quantity ?? 0;

    if (existing.length > 0) {
      await db.update(stockInventory)
        .set({ quantity: stockBefore + quantity, lastUpdatedAt: new Date() })
        .where(eq(stockInventory.id, existing[0].id));
    } else {
      await db.insert(stockInventory).values({
        tenantId, warehouseId, itemId: item.id, quantity,
      });
    }

    await db.insert(stockTransactions).values({
      tenantId,
      warehouseId,
      itemId: item.id,
      transactionType: 'in',
      quantity,
      recipientNote: '由 94CramBot 進貨',
      performedBy: '00000000-0000-0000-0000-000000000000',
    });

    return c.json({
      success: true,
      message: `已進貨：${item.name} ${quantity}${item.unit}`,
      data: { item_name: item.name, quantity_added: quantity, stock_before: stockBefore, stock_after: stockBefore + quantity },
    });
  } catch (error) {
    console.error('[Bot] restock error:', error);
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

// POST /stock/check
app.post('/check', async (c) => {
  try {
    const { item_name, item_id } = await c.req.json();
    const tenantId = c.get('tenantId') as string;

    let items;
    if (item_id) {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), eq(stockItems.id, item_id)));
    } else {
      items = await db.select().from(stockItems)
        .where(and(eq(stockItems.tenantId, tenantId), like(stockItems.name, `%${item_name}%`)));
    }

    if (items.length === 0) {
      return c.json({ success: false, error: 'item_not_found', message: `找不到品項「${item_name}」` });
    }

    const item = items[0];
    const inventoryRows = await db.select().from(stockInventory)
      .where(and(eq(stockInventory.tenantId, tenantId), eq(stockInventory.itemId, item.id)));
    const totalStock = inventoryRows.reduce((sum, r) => sum + r.quantity, 0);

    return c.json({
      success: true,
      message: `${item.name} 目前庫存 ${totalStock} ${item.unit}`,
      data: { item_name: item.name, item_id: item.id, current_stock: totalStock, unit: item.unit },
    });
  } catch (error) {
    return c.json({ success: false, error: 'internal', message: '系統錯誤' }, 500);
  }
});

export default app;
