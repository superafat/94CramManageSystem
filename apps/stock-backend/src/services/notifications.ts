import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/index';
import { stockNotificationSettings, stockNotifications } from '@94cram/shared/db';
import { sendNotification as sendTelegramNotification } from './telegram';

export const NOTIFICATION_TYPES = ['low_stock', 'purchase_approval', 'system'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export async function getNotificationSettings(tenantId: string) {
  const settings = await db.select().from(stockNotificationSettings).where(eq(stockNotificationSettings.tenantId, tenantId));
  const byType = new Map(settings.map((row) => [row.type, row]));
  return NOTIFICATION_TYPES.map((type) => byType.get(type) ?? {
    id: '',
    tenantId,
    type,
    telegramChatId: '',
    telegramBotToken: '',
    isEnabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function upsertNotificationSettings(
  tenantId: string,
  settings: Array<{
    type: NotificationType;
    telegramChatId?: string;
    telegramBotToken?: string;
    isEnabled?: boolean;
  }>,
) {
  for (const setting of settings) {
    const [existing] = await db.select().from(stockNotificationSettings).where(and(
      eq(stockNotificationSettings.tenantId, tenantId),
      eq(stockNotificationSettings.type, setting.type),
    ));

    if (existing) {
      await db.update(stockNotificationSettings).set({
        telegramChatId: setting.telegramChatId ?? existing.telegramChatId,
        telegramBotToken: setting.telegramBotToken ?? existing.telegramBotToken,
        isEnabled: setting.isEnabled ?? existing.isEnabled,
        updatedAt: new Date(),
      }).where(eq(stockNotificationSettings.id, existing.id));
    } else {
      await db.insert(stockNotificationSettings).values({
        tenantId,
        type: setting.type,
        telegramChatId: setting.telegramChatId,
        telegramBotToken: setting.telegramBotToken,
        isEnabled: setting.isEnabled ?? true,
      });
    }
  }
}

export async function getNotificationHistory(tenantId: string) {
  return db.select().from(stockNotifications)
    .where(eq(stockNotifications.tenantId, tenantId))
    .orderBy(desc(stockNotifications.createdAt))
    .limit(100);
}

async function sendByType(tenantId: string, type: NotificationType, title: string, message: string) {
  const [setting] = await db.select().from(stockNotificationSettings).where(and(
    eq(stockNotificationSettings.tenantId, tenantId),
    eq(stockNotificationSettings.type, type),
  ));

  const [log] = await db.insert(stockNotifications).values({
    tenantId,
    type,
    title,
    message,
    telegramChatId: setting?.telegramChatId,
    status: 'pending',
  }).returning();

  if (!setting?.isEnabled || !setting.telegramBotToken || !setting.telegramChatId) {
    await db.update(stockNotifications).set({
      status: 'failed',
      errorMessage: 'Notification setting is missing or disabled',
    }).where(eq(stockNotifications.id, log.id));
    return null;
  }

  try {
    const sent = await sendTelegramNotification({
      botToken: setting.telegramBotToken,
      chatId: setting.telegramChatId,
      message,
      parseMode: 'Markdown',
    });
    await db.update(stockNotifications).set({
      status: 'sent',
      telegramMessageId: String(sent.message_id),
      sentAt: new Date(),
    }).where(eq(stockNotifications.id, log.id));
    return sent;
  } catch (error) {
    await db.update(stockNotifications).set({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }).where(eq(stockNotifications.id, log.id));
    throw error;
  }
}

export async function sendLowStockAlert(
  tenantId: string,
  item: { id: string; name: string; safetyStock: number | null },
  warehouse: { id: string; name: string },
  currentQty: number,
) {
  const safetyStock = item.safetyStock ?? 0;
  const title = '低庫存警示';
  const message = `*低庫存警示*\n品項：${item.name}\n倉庫：${warehouse.name}\n目前庫存：${currentQty}\n安全庫存：${safetyStock}`;
  return sendByType(tenantId, 'low_stock', title, message);
}

export async function sendPurchaseApprovalAlert(
  tenantId: string,
  purchaseOrder: { id: string; warehouseName?: string; supplierName?: string | null; totalAmount?: string | null },
) {
  const title = '進貨單待審核';
  const message = `*進貨單待審核*\n單號：${purchaseOrder.id.slice(0, 8)}\n倉庫：${purchaseOrder.warehouseName || '-'}\n供應商：${purchaseOrder.supplierName || '-'}\n總金額：${purchaseOrder.totalAmount || '-'}`;
  return sendByType(tenantId, 'purchase_approval', title, message);
}

export async function sendSystemNotification(tenantId: string, title: string, message: string) {
  return sendByType(tenantId, 'system', title, message);
}
