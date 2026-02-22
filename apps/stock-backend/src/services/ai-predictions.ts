import { and, desc, eq, gte, isNull, or } from 'drizzle-orm';
import { db } from '../db/index';
import {
  stockAiPredictions,
  stockHistoricalUsage,
  stockInventory,
  stockItems,
  stockPurchaseItems,
  stockPurchaseOrders,
  stockTransactions,
} from '../db/schema';

export async function getPredictions(tenantId: string) {
  return db.select().from(stockAiPredictions)
    .where(eq(stockAiPredictions.tenantId, tenantId))
    .orderBy(desc(stockAiPredictions.createdAt));
}

export async function getHistoricalUsage(tenantId: string) {
  return db.select().from(stockHistoricalUsage)
    .where(eq(stockHistoricalUsage.tenantId, tenantId))
    .orderBy(desc(stockHistoricalUsage.year), desc(stockHistoricalUsage.month));
}

export async function runSemesterPrediction(
  tenantId: string,
  input: { schoolYear: string; semester: string; classCount: number; studentCount: number },
) {
  const historicalRows = await getHistoricalUsage(tenantId);
  const inventoryRows = await db.select({
    inventory: stockInventory,
    item: stockItems,
  }).from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .where(eq(stockInventory.tenantId, tenantId));

  const created = [];
  for (const row of inventoryRows) {
    const related = historicalRows.filter((h) => h.itemId === row.inventory.itemId && h.warehouseId === row.inventory.warehouseId).slice(0, 18);
    const avgMonthlyUsage = related.length > 0
      ? related.reduce((sum, h) => sum + h.outQuantity, 0) / related.length
      : 0;
    const avgClassCount = related.length > 0
      ? (related.reduce((sum, h) => sum + (h.classCount || 0), 0) / related.length) || 1
      : 1;
    const avgStudentCount = related.length > 0
      ? (related.reduce((sum, h) => sum + (h.studentCount || 0), 0) / related.length) || 1
      : 1;
    const classFactor = input.classCount > 0 ? input.classCount / avgClassCount : 1;
    const studentFactor = input.studentCount > 0 ? input.studentCount / avgStudentCount : 1;
    const semestersMonths = 6;
    const predictedQuantity = Math.max(0, Math.ceil(avgMonthlyUsage * semestersMonths * classFactor * studentFactor));
    const confidence = related.length >= 12 ? '0.90' : related.length >= 6 ? '0.75' : '0.60';

    const [prediction] = await db.insert(stockAiPredictions).values({
      tenantId,
      itemId: row.inventory.itemId,
      warehouseId: row.inventory.warehouseId,
      predictionType: 'semester_prep',
      predictedQuantity,
      confidence,
      reason: `依歷史平均月用量 ${avgMonthlyUsage.toFixed(1)}，並按班級/學生規模調整`,
      schoolYear: input.schoolYear,
      semester: input.semester,
    }).returning();
    created.push({ prediction, item: row.item });
  }

  return created;
}

export async function runAutoReorderPrediction(tenantId: string) {
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const inventoryRows = await db.select({
    inventory: stockInventory,
    item: stockItems,
  }).from(stockInventory)
    .innerJoin(stockItems, eq(stockInventory.itemId, stockItems.id))
    .where(eq(stockInventory.tenantId, tenantId));

  const outTransactions = await db.select().from(stockTransactions).where(and(
    eq(stockTransactions.tenantId, tenantId),
    gte(stockTransactions.createdAt, fromDate),
    or(
      eq(stockTransactions.transactionType, 'sale_out'),
      eq(stockTransactions.transactionType, 'promo_out'),
      eq(stockTransactions.transactionType, 'internal_use'),
      eq(stockTransactions.transactionType, 'class_distribution'),
    ),
  ));

  const created = [];
  for (const row of inventoryRows) {
    const consumed = Math.abs(outTransactions
      .filter((t) => t.itemId === row.inventory.itemId && t.warehouseId === row.inventory.warehouseId)
      .reduce((sum, t) => sum + t.quantity, 0));
    const dailyUsage = consumed / 30;
    const currentQty = row.inventory.quantity;
    const safetyStock = row.item.safetyStock || 0;
    const stockDays = dailyUsage > 0 ? currentQty / dailyUsage : Number.POSITIVE_INFINITY;
    if (currentQty > safetyStock && stockDays >= 14) continue;

    const predictedQuantity = Math.max(Math.ceil(dailyUsage * 30), (safetyStock * 2) - currentQty, 1);
    const [prediction] = await db.insert(stockAiPredictions).values({
      tenantId,
      itemId: row.inventory.itemId,
      warehouseId: row.inventory.warehouseId,
      predictionType: 'auto_reorder',
      predictedQuantity,
      confidence: consumed > 0 ? '0.80' : '0.55',
      reason: `近 30 天平均日消耗 ${dailyUsage.toFixed(2)}，可用天數 ${Number.isFinite(stockDays) ? stockDays.toFixed(1) : '∞'}`,
    }).returning();
    created.push({ prediction, item: row.item });
  }

  return created;
}

export async function applyPredictionToPurchaseOrder(tenantId: string, predictionId: string, userId: string) {
  const [prediction] = await db.select().from(stockAiPredictions).where(and(
    eq(stockAiPredictions.id, predictionId),
    eq(stockAiPredictions.tenantId, tenantId),
    isNull(stockAiPredictions.appliedAt),
  ));
  if (!prediction) {
    throw new Error('Prediction not found or already applied');
  }

  const [order] = await db.insert(stockPurchaseOrders).values({
    tenantId,
    warehouseId: prediction.warehouseId,
    supplierId: null,
    status: 'draft',
    orderDate: new Date(),
    notes: `Created from AI prediction ${prediction.id}`,
    totalAmount: null,
    createdBy: userId,
  }).returning();

  await db.insert(stockPurchaseItems).values({
    purchaseOrderId: order.id,
    itemId: prediction.itemId,
    quantity: prediction.predictedQuantity,
    unitPrice: null,
    totalPrice: null,
  });

  await db.update(stockAiPredictions).set({ appliedAt: new Date() }).where(eq(stockAiPredictions.id, prediction.id));
  return order;
}
