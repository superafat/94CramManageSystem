import { callBotApi } from '../modules/api-client';
import { setCache, type TenantCache } from '../firestore/cache';
import { authenticate } from '../modules/auth-manager';
import { sendMessage } from '../utils/telegram';

export async function handleSync(chatId: string, userId: string): Promise<void> {
  const auth = await authenticate(userId);
  if (!auth) {
    await sendMessage(chatId, '❌ 尚未綁定補習班，請先使用 /bind');
    return;
  }

  await sendMessage(chatId, '🔄 正在同步資料...');

  const body = { tenant_id: auth.tenantId };
  const [studentsRes, classesRes, itemsRes, warehousesRes] = await Promise.all([
    callBotApi('manage', '/data/students', body),
    callBotApi('manage', '/data/classes', body),
    callBotApi('stock', '/data/items', body),
    callBotApi('stock', '/data/warehouses', body),
  ]);

  const cache: TenantCache = {
    students: Array.isArray(studentsRes.data) ? studentsRes.data as TenantCache['students'] : [],
    classes: Array.isArray(classesRes.data) ? classesRes.data as TenantCache['classes'] : [],
    items: Array.isArray(itemsRes.data) ? itemsRes.data as TenantCache['items'] : [],
    warehouses: Array.isArray(warehousesRes.data) ? warehousesRes.data as TenantCache['warehouses'] : [],
    last_synced_at: new Date(),
  };

  await setCache(auth.tenantId, cache);
  await sendMessage(
    chatId,
    `✅ 同步完成！\n📚 學生 ${cache.students.length} 人\n🏫 班級 ${cache.classes.length} 個\n📦 品項 ${cache.items.length} 個\n🏪 倉庫 ${cache.warehouses.length} 個`
  );
}
