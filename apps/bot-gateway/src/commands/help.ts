import { sendMessage } from '../utils/telegram';

export async function handleHelp(chatId: string): Promise<void> {
  await sendMessage(
    chatId,
    `🤖 <b>94CramBot 使用說明</b>

<b>📋 點名系統</b>
• 「陳小明今天請假」→ 登記請假
• 「王大明遲到」→ 登記遲到
• 「今天高一到課狀況」→ 查出缺勤

<b>💰 帳務系統</b>
• 「高二陳小明繳5000元」→ 登記繳費
• 「這個月收了多少學費」→ 查收費摘要
• 「陳小明繳費紀錄」→ 查繳費歷史

<b>📦 庫存系統</b>
• 「寄文學館1店 紅色鐵盒100本」→ 出貨
• 「進貨 科學筆記200本」→ 進貨
• 「紅色鐵盒還剩幾本」→ 查庫存

<b>⚙️ 系統指令</b>
• /bind 123456 → 綁定補習班
• /switch → 切換補習班
• /sync → 同步資料
• /help → 顯示本說明

所有<b>寫入操作</b>都會先確認才執行！`
  );
}
