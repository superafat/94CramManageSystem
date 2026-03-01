/**
 * /對話 command — lets admins view recent parent-bot conversations
 */
import { getRecentConversations } from '../firestore/parent-conversations';
import { getBinding } from '../firestore/bindings';
import { sendMessage } from '../utils/telegram';

export async function handleConversations(chatId: string, userId: string): Promise<void> {
  const binding = await getBinding(userId);
  if (!binding) {
    await sendMessage(chatId, '⚠️ 請先綁定補習班');
    return;
  }

  const conversations = await getRecentConversations(binding.active_tenant_id, 15);

  if (conversations.length === 0) {
    await sendMessage(chatId, '📭 目前還沒有家長對話紀錄');
    return;
  }

  let text = `📋 <b>最近家長對話紀錄</b>\n🏫 ${binding.active_tenant_name}\n\n`;

  for (const conv of conversations) {
    const time = conv.created_at instanceof Date
      ? conv.created_at
      : new Date(conv.created_at);
    const timeStr = time.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const chatLabel = conv.chat_type === 'group' ? '👥' : '👤';

    text += `${chatLabel} <b>${conv.parent_name}</b>（${timeStr}）\n`;
    text += `💬 ${truncate(conv.user_message, 60)}\n`;
    text += `🤖 ${truncate(conv.bot_response, 80)}\n\n`;
  }

  text += `共 ${conversations.length} 筆紀錄`;

  // Telegram message limit is 4096 chars
  if (text.length > 4000) {
    text = text.slice(0, 3950) + '\n\n⋯（更多紀錄請查看後台）';
  }

  await sendMessage(chatId, text);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}
