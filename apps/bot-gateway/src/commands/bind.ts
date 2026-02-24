import { firestore } from '../firestore/client';
import { addBinding } from '../firestore/bindings';
import { sendMessage } from '../utils/telegram';

export async function handleBind(chatId: string, userId: string, args: string): Promise<void> {
  const code = args.trim();
  if (!code || code.length !== 6) {
    await sendMessage(chatId, '❌ 格式錯誤，請輸入：/bind 123456');
    return;
  }

  const codeRef = firestore.collection('bot_bind_codes').doc(code);
  const codeDoc = await codeRef.get();

  if (!codeDoc.exists) {
    await sendMessage(chatId, '❌ 綁定碼不存在或已過期');
    return;
  }

  const codeData = codeDoc.data()!;
  if (codeData.used) {
    await sendMessage(chatId, '❌ 此綁定碼已被使用');
    return;
  }

  const expiresAt = codeData.expires_at?.toDate?.() ?? new Date(codeData.expires_at);
  if (expiresAt < new Date()) {
    await sendMessage(chatId, '❌ 綁定碼已過期，請重新生成');
    return;
  }

  await codeRef.update({ used: true });
  await addBinding(userId, codeData.tenant_id, codeData.tenant_name);

  await sendMessage(
    chatId,
    `✅ 綁定成功！\n🏫 ${codeData.tenant_name}\n\n現在可以直接輸入指令操作，例如：\n「陳小明今天請假」\n「高二陳小明繳5000元」`
  );
}
