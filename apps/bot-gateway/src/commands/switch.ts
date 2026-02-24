import { getBinding, switchTenant } from '../firestore/bindings';
import { sendMessage } from '../utils/telegram';

export async function handleSwitch(chatId: string, userId: string, args: string): Promise<void> {
  const binding = await getBinding(userId);
  if (!binding || binding.bindings.length === 0) {
    await sendMessage(chatId, '❌ 尚未綁定任何補習班，請先使用 /bind');
    return;
  }

  if (binding.bindings.length === 1) {
    await sendMessage(chatId, `你只有綁定一間補習班：${binding.active_tenant_name}`);
    return;
  }

  const choice = args.trim();
  if (!choice) {
    const list = binding.bindings
      .map((b, i) => {
        const current = b.tenant_id === binding.active_tenant_id ? ' ← 目前' : '';
        return `${i + 1}️⃣ ${b.tenant_name}${current}`;
      })
      .join('\n');
    await sendMessage(chatId, `🏫 你管理的補習班：\n${list}\n\n請回覆數字切換，例如：/switch 2`);
    return;
  }

  const index = parseInt(choice) - 1;
  if (isNaN(index) || index < 0 || index >= binding.bindings.length) {
    await sendMessage(chatId, '❌ 無效的選擇');
    return;
  }

  const target = binding.bindings[index];
  await switchTenant(userId, target.tenant_id);
  await sendMessage(chatId, `✅ 已切換到：${target.tenant_name}\n接下來的操作都會在這裡執行。`);
}
