// Admin bot mock responses — keyed by intent string
export const ADMIN_MOCK_RESPONSES: Record<
  string,
  (params: Record<string, unknown>) => { success: boolean; message: string }
> = {
  'inclass.query': (_params) => ({
    success: true,
    message:
      '📋 高二A班 今日出勤名單（02/28）\n\n' +
      '✅ 陳小利 — 到課\n' +
      '✅ 林美琪 — 到課\n' +
      '⏰ 王大明 — 遲到 10 分鐘\n' +
      '📝 張志豪 — 請假\n' +
      '✅ 李宜庭 — 到課\n\n' +
      '出勤率：80%（4/5）',
  }),

  'inclass.query_list': (_params) => ({
    success: true,
    message:
      '📋 高二A班 今日出勤名單（02/28）\n\n' +
      '✅ 陳小利 — 到課\n' +
      '✅ 林美琪 — 到課\n' +
      '⏰ 王大明 — 遲到 10 分鐘\n' +
      '📝 張志豪 — 請假\n' +
      '✅ 李宜庭 — 到課\n\n' +
      '出勤率：80%（4/5）',
  }),

  'inclass.leave': (params) => {
    const name = (params.student_name as string) ?? '學生';
    const date = (params.date as string) ?? '今日';
    return {
      success: true,
      message: `📝 已登記請假\n\n學生：${name}\n日期：${date}\n狀態：✅ 登記成功`,
    };
  },

  'inclass.late': (params) => {
    const name = (params.student_name as string) ?? '學生';
    const date = (params.date as string) ?? '今日';
    return {
      success: true,
      message: `⏰ 已登記遲到\n\n學生：${name}\n日期：${date}\n狀態：✅ 登記成功`,
    };
  },

  'inclass.checkin': (params) => {
    const name = (params.student_name as string) ?? '學生';
    const date = (params.date as string) ?? '今日';
    return {
      success: true,
      message: `✅ 已簽到\n\n學生：${name}\n日期：${date}\n時間：14:05`,
    };
  },

  'inclass.query_report': (params) => {
    const name = (params.student_name as string) ?? '陳小利';
    return {
      success: true,
      message:
        `📊 ${name} 本月出勤報告\n\n` +
        '期間：02/01 – 02/28\n\n' +
        '✅ 到課：18 堂\n' +
        '❌ 未到：1 堂（02/10）\n' +
        '⏰ 遲到：1 堂（02/20）\n' +
        '📝 請假：2 堂\n\n' +
        '出勤率：90%',
    };
  },

  'manage.payment': (params) => {
    const name = (params.student_name as string) ?? '學生';
    const amount = (params.amount as number) ?? 4500;
    return {
      success: true,
      message:
        `💰 已登記繳費\n\n` +
        `學生：${name}\n` +
        `金額：NT$ ${Number(amount).toLocaleString()}\n` +
        `日期：02/28\n` +
        `狀態：✅ 登記成功`,
    };
  },

  'manage.add_student': (params) => {
    const name = (params.student_name as string) ?? '新學生';
    const cls = (params.class_name as string) ?? '待分班';
    return {
      success: true,
      message:
        `🏫 已新增學生\n\n` +
        `姓名：${name}\n` +
        `班級：${cls}\n` +
        `狀態：✅ 新增成功`,
    };
  },

  'manage.query_student': (params) => {
    const name = (params.student_name as string) ?? '陳小利';
    return {
      success: true,
      message:
        `🔍 學生資料\n\n` +
        `姓名：${name}\n` +
        `班級：高二A班\n` +
        `學校：台北市立第一高中\n` +
        `入學日期：2024/09/01\n` +
        `家長電話：0912-345-678`,
    };
  },

  'manage.query_finance': (_params) => ({
    success: true,
    message:
      '💰 本月收費摘要（02/01 – 02/28）\n\n' +
      '已收：NT$ 45,000\n' +
      '待收：NT$ 15,000\n' +
      '逾期：NT$ 5,000\n\n' +
      '應收合計：NT$ 65,000\n' +
      '收款率：69%',
  }),

  'manage.query_history': (params) => {
    const name = (params.student_name as string) ?? '陳小利';
    return {
      success: true,
      message:
        `📋 ${name} 繳費紀錄\n\n` +
        '02/05 NT$ 4,500 — 2月學費 ✅\n' +
        '01/06 NT$ 4,500 — 1月學費 ✅\n' +
        '12/04 NT$ 4,500 — 12月學費 ✅\n' +
        '11/07 NT$ 4,500 — 11月學費 ✅\n\n' +
        '共 4 筆，合計 NT$ 18,000',
    };
  },

  'stock.query': (params) => {
    const item = (params.item_name as string) ?? '數學題本';
    return {
      success: true,
      message:
        `📦 ${item} 庫存狀況\n\n` +
        '現有庫存：85 本\n' +
        '所在倉庫：總部倉庫\n\n' +
        '最近異動：\n' +
        '02/20 出貨 15 本 → 文學館1店\n' +
        '02/10 進貨 50 本 ← 出版社',
    };
  },

  'stock.ship': (params) => {
    const item = (params.item_name as string) ?? '數學題本';
    const qty = (params.quantity as number) ?? 10;
    const dest = (params.destination as string) ?? '文學館1店';
    return {
      success: true,
      message:
        `📦 出貨完成\n\n` +
        `品項：${item}\n` +
        `數量：${qty} 本\n` +
        `目的地：${dest}\n` +
        `狀態：✅ 出貨成功`,
    };
  },

  'stock.restock': (params) => {
    const item = (params.item_name as string) ?? '數學題本';
    const qty = (params.quantity as number) ?? 50;
    return {
      success: true,
      message:
        `📦 進貨完成\n\n` +
        `品項：${item}\n` +
        `數量：${qty} 本\n` +
        `倉庫：總部倉庫\n` +
        `狀態：✅ 進貨成功`,
    };
  },

  'stock.query_history': (_params) => ({
    success: true,
    message:
      '📋 近期出入貨紀錄\n\n' +
      '02/20 出貨 15 本 數學題本 → 文學館1店\n' +
      '02/15 進貨 30 本 科學筆記 ← 出版社\n' +
      '02/10 出貨 20 本 英文單字卡 → 文學館1店\n' +
      '02/05 進貨 50 本 數學題本 ← 出版社\n' +
      '01/28 出貨 10 本 紅色鐵盒 → 文學館1店',
  }),
};

// Parent bot mock responses — keyed by parent intent string
export const PARENT_MOCK_RESPONSES: Record<
  string,
  (params: Record<string, unknown>) => string
> = {
  'parent.attendance': (_params) =>
    '📊 陳小利 本月出勤紀錄（02/01–02/28）\n\n' +
    '✅ 到課：18 堂\n' +
    '❌ 未到：1 堂（02/10）\n' +
    '⏰ 遲到：1 堂（02/20，晚 8 分鐘）\n\n' +
    '出勤率：90% 👍\n\n' +
    '上次到課：今天 14:03',

  'parent.payments': (_params) =>
    '💰 陳小利 繳費狀況\n\n' +
    '本月（2月）：✅ 已繳清\n' +
    '金額：NT$ 4,500\n' +
    '繳費日期：02/05\n\n' +
    '近期繳費紀錄：\n' +
    '• 2月 NT$ 4,500 ✅\n' +
    '• 1月 NT$ 4,500 ✅\n' +
    '• 12月 NT$ 4,500 ✅',

  'parent.schedule': (_params) =>
    '📅 陳小利 課表\n\n' +
    '🗓 週二 19:00–20:30 國文\n' +
    '🗓 週四 19:00–20:30 數學\n' +
    '🗓 週六 14:00–15:30 英文\n\n' +
    '下次上課：週四 19:00\n' +
    '地點：蜂神榜示範教室 高二A班教室',

  'parent.info': (_params) =>
    '🏫 蜂神榜示範教室\n\n' +
    '📍 地址：台北市中正區重慶南路一段100號\n' +
    '📞 電話：(02) 2381-0000\n' +
    '🕐 營業時間：週一至週六 14:00–22:00\n\n' +
    '有任何問題歡迎直接來電或傳訊息給我們 😊',

  'parent.leave': (params) => {
    const date = (params.date as string) ?? '明天';
    return (
      `📝 收到請假申請！\n\n` +
      `學生：陳小利\n` +
      `請假日期：${date}\n\n` +
      `已轉達老師，老師確認後會通知您。\n` +
      `如需取消請假，請提前告知，謝謝 🙏`
    );
  },

  'parent.help': (_params) =>
    '👋 您好，陳媽媽！\n\n' +
    '我是蜂神榜示範教室的順風耳，可以幫您查詢：\n\n' +
    '📊 <b>出勤紀錄</b> — 「小利今天到了嗎？」\n' +
    '💰 <b>繳費狀況</b> — 「學費繳了嗎？」\n' +
    '📅 <b>課表查詢</b> — 「這週什麼時候上課？」\n' +
    '📝 <b>幫孩子請假</b> — 「小利明天請假」\n' +
    '🏫 <b>補習班資訊</b> — 「地址是哪？」\n\n' +
    '⚠️ <i>這是 Demo 模式，輸入 /exit 可離開</i>',

  'parent.unknown': (_params) =>
    '您好！關於您的問題，我幫您查了一下補習班的資訊：\n\n' +
    '🏫 <b>蜂神榜示範教室</b> 目前正常營業中。\n' +
    '如有特殊問題，歡迎直接致電 (02) 2381-0000，\n' +
    '或由我幫您轉達給班主任處理 😊',
};
