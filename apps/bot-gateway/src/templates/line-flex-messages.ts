/**
 * LINE Flex Message 卡片模板
 *
 * 提供補習班家長 Bot 使用的 Flex Message 卡片物件工廠。
 * 每個函式接受資料參數，回傳符合 LINE Messaging API 規範的 Flex Message 物件。
 *
 * 參考：https://developers.line.biz/en/docs/messaging-api/flex-message-elements/
 */

// ─── 共用型別 ────────────────────────────────────────────────────────────────

export interface LineFlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble | FlexCarousel;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: {
    header?: { backgroundColor?: string; separator?: boolean };
    body?: { backgroundColor?: string };
    footer?: { backgroundColor?: string; separator?: boolean };
  };
}

export interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingStart?: string;
  paddingEnd?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  cornerRadius?: string;
}

export type FlexComponent =
  | FlexText
  | FlexButton
  | FlexSeparator
  | FlexBox
  | FlexFiller
  | FlexImage;

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  color?: string;
  weight?: 'regular' | 'bold';
  wrap?: boolean;
  maxLines?: number;
  align?: 'start' | 'center' | 'end';
  flex?: number;
  margin?: string;
  decoration?: 'none' | 'underline' | 'line-through';
}

export interface FlexButton {
  type: 'button';
  action: LineAction;
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  margin?: string;
  height?: 'sm' | 'md';
  flex?: number;
}

export interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

export interface FlexFiller {
  type: 'filler';
}

export interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  margin?: string;
}

export interface LineAction {
  type: 'message' | 'uri' | 'postback' | 'datetimepicker';
  label: string;
  text?: string;
  uri?: string;
  data?: string;
}

// ─── 共用輔助 ────────────────────────────────────────────────────────────────

/** 莫蘭迪色系（與 94CramManageSystem UI 一致） */
const COLORS = {
  headerBg: '#8B9E9B',       // 莫蘭迪綠灰
  primaryText: '#3D4A4A',    // 深灰
  secondaryText: '#6B7B7A',  // 中灰
  accentGreen: '#5D8A7B',    // 強調綠
  accentOrange: '#C4855A',   // 強調橙（警示）
  white: '#FFFFFF',
  lightBg: '#F5F2EE',        // 淡米色背景
  separatorColor: '#DDD8D2',
  badgeGreen: '#4CAF8A',
  badgeGray: '#9E9E9E',
  badgeRed: '#D9534F',
} as const;

function headerBox(title: string): FlexBox {
  return {
    type: 'box',
    layout: 'vertical',
    contents: [
      {
        type: 'text',
        text: title,
        size: 'lg',
        weight: 'bold',
        color: COLORS.white,
        wrap: true,
      },
    ],
    paddingAll: '16px',
    backgroundColor: COLORS.headerBg,
  };
}

function labelValueRow(label: string, value: string, valueColor?: string): FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: label,
        size: 'sm',
        color: COLORS.secondaryText,
        flex: 2,
      },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: valueColor ?? COLORS.primaryText,
        weight: 'bold',
        flex: 3,
        align: 'end',
        wrap: true,
      },
    ],
    margin: 'sm',
  };
}

function separator(): FlexSeparator {
  return {
    type: 'separator',
    margin: 'md',
    color: COLORS.separatorColor,
  };
}

// ─── 1. 查看課表卡片 ──────────────────────────────────────────────────────────

export interface ScheduleItem {
  courseName: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;  // e.g. '週二', '週四'
  room?: string;
}

export interface ScheduleCardData {
  childName: string;
  schedules: ScheduleItem[];
  /** 完整課表的 URL（選填） */
  fullScheduleUrl?: string;
}

/**
 * 查看課表卡片
 * 觸發關鍵字：課表、上課、課程
 */
export function scheduleCard(data: ScheduleCardData): LineFlexMessage {
  const { childName, schedules, fullScheduleUrl } = data;

  // Group by day
  const byDay = new Map<string, ScheduleItem[]>();
  for (const s of schedules) {
    const day = s.dayOfWeek;
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(s);
  }

  const courseRows: FlexComponent[] = [];

  if (byDay.size === 0) {
    courseRows.push({
      type: 'text',
      text: '目前沒有排課資料',
      size: 'sm',
      color: COLORS.secondaryText,
      wrap: true,
    });
  } else {
    let first = true;
    for (const [day, items] of byDay) {
      if (!first) courseRows.push(separator());
      first = false;

      // Day header
      courseRows.push({
        type: 'text',
        text: day,
        size: 'sm',
        weight: 'bold',
        color: COLORS.accentGreen,
        margin: first ? 'none' : 'md',
      });

      for (const item of items) {
        const roomLabel = item.room ? `  ${item.room}` : '';
        courseRows.push({
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: `${item.startTime}～${item.endTime}`,
              size: 'xs',
              color: COLORS.secondaryText,
              flex: 3,
            },
            {
              type: 'text',
              text: `${item.courseName}${roomLabel}`,
              size: 'xs',
              color: COLORS.primaryText,
              flex: 4,
              wrap: true,
            },
          ],
          margin: 'xs',
        });
      }
    }
  }

  const footerContents: FlexComponent[] = [
    {
      type: 'button',
      action: {
        type: fullScheduleUrl ? 'uri' : 'message',
        label: '查看完整課表',
        ...(fullScheduleUrl
          ? { uri: fullScheduleUrl }
          : { text: '查看完整課表' }),
      },
      style: 'primary',
      color: COLORS.accentGreen,
      height: 'sm',
    },
  ];

  return {
    type: 'flex',
    altText: `📅 ${childName}的課表`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: headerBox(`📅 ${childName}的本週課表`),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: courseRows,
        paddingAll: '16px',
        backgroundColor: COLORS.lightBg,
        spacing: 'sm',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: footerContents,
        paddingAll: '12px',
        backgroundColor: COLORS.white,
      },
      styles: {
        footer: { separator: true },
      },
    },
  };
}

// ─── 2. 查看學費卡片 ──────────────────────────────────────────────────────────

export interface BillingItem {
  period: string;   // e.g. '2026-03'
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
}

export interface BillingCardData {
  childName: string;
  totalUnpaid: number;
  totalPaid: number;
  unpaidItems: BillingItem[];
  /** 立即繳費連結（選填） */
  paymentUrl?: string;
}

/**
 * 查看學費卡片
 * 觸發關鍵字：學費、繳費
 */
export function billingCard(data: BillingCardData): LineFlexMessage {
  const { childName, totalUnpaid, totalPaid, unpaidItems, paymentUrl } = data;

  const statusColor = totalUnpaid > 0 ? COLORS.accentOrange : COLORS.badgeGreen;
  const statusLabel = totalUnpaid > 0
    ? `⚠️ 待繳 NT$${totalUnpaid.toLocaleString()}`
    : '✅ 已繳清';

  const summaryRows: FlexComponent[] = [
    labelValueRow('繳費狀態', statusLabel, statusColor),
    labelValueRow('未繳金額', `NT$${totalUnpaid.toLocaleString()}`, COLORS.accentOrange),
    labelValueRow('已繳金額', `NT$${totalPaid.toLocaleString()}`, COLORS.accentGreen),
  ];

  const unpaidRows: FlexComponent[] = [];
  if (unpaidItems.length > 0) {
    unpaidRows.push(separator());
    unpaidRows.push({
      type: 'text',
      text: '待繳項目',
      size: 'sm',
      weight: 'bold',
      color: COLORS.primaryText,
      margin: 'md',
    });
    for (const item of unpaidItems) {
      const statusEmoji =
        item.status === 'overdue' ? '❌' :
        item.status === 'pending' ? '⏳' : '✅';
      unpaidRows.push({
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'text',
            text: `${statusEmoji} ${item.period}`,
            size: 'sm',
            color: item.status === 'overdue' ? COLORS.badgeRed : COLORS.secondaryText,
            flex: 3,
          },
          {
            type: 'text',
            text: `NT$${item.amount.toLocaleString()}`,
            size: 'sm',
            color: COLORS.primaryText,
            weight: 'bold',
            flex: 2,
            align: 'end',
          },
        ],
        margin: 'sm',
      });
    }
  }

  const footerButtons: FlexComponent[] = [
    {
      type: 'button',
      action: {
        type: paymentUrl ? 'uri' : 'message',
        label: '立即繳費',
        ...(paymentUrl
          ? { uri: paymentUrl }
          : { text: '如何繳費' }),
      },
      style: 'primary',
      color: COLORS.accentOrange,
      height: 'sm',
      flex: 1,
    },
    {
      type: 'button',
      action: {
        type: 'message',
        label: '繳費歷史',
        text: '查看繳費歷史',
      },
      style: 'secondary',
      height: 'sm',
      flex: 1,
    },
  ];

  return {
    type: 'flex',
    altText: `💰 ${childName}的繳費資訊`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: headerBox(`💰 ${childName}的繳費資訊`),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [...summaryRows, ...unpaidRows],
        paddingAll: '16px',
        backgroundColor: COLORS.lightBg,
        spacing: 'sm',
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        contents: footerButtons,
        spacing: 'sm',
        paddingAll: '12px',
        backgroundColor: COLORS.white,
      },
      styles: {
        footer: { separator: true },
      },
    },
  };
}

// ─── 3. 課程推薦卡片 ──────────────────────────────────────────────────────────

export interface RecommendationCardData {
  courseName: string;
  teacherName: string;
  fee: number;
  /** 費用單位，如 '元/月'、'元/堂' */
  feeUnit?: string;
  weakSubjectNote?: string;
  /** 課程詳情連結（選填） */
  detailUrl?: string;
  /** 試聽預約連結（選填） */
  trialUrl?: string;
}

/**
 * 課程推薦卡片
 * 觸發關鍵字：推薦
 */
export function recommendationCard(data: RecommendationCardData): LineFlexMessage {
  const {
    courseName,
    teacherName,
    fee,
    feeUnit = '元/月',
    weakSubjectNote,
    detailUrl,
    trialUrl,
  } = data;

  const bodyContents: FlexComponent[] = [
    {
      type: 'text',
      text: courseName,
      size: 'xl',
      weight: 'bold',
      color: COLORS.primaryText,
      wrap: true,
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👨‍🏫 授課教師',
          size: 'sm',
          color: COLORS.secondaryText,
          flex: 2,
        },
        {
          type: 'text',
          text: teacherName,
          size: 'sm',
          color: COLORS.primaryText,
          weight: 'bold',
          flex: 3,
          align: 'end',
        },
      ],
      margin: 'md',
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '💰 費用',
          size: 'sm',
          color: COLORS.secondaryText,
          flex: 2,
        },
        {
          type: 'text',
          text: `NT$${fee.toLocaleString()} ${feeUnit}`,
          size: 'sm',
          color: COLORS.accentOrange,
          weight: 'bold',
          flex: 3,
          align: 'end',
        },
      ],
      margin: 'sm',
    },
  ];

  if (weakSubjectNote) {
    bodyContents.push(separator());
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎯 推薦理由',
          size: 'sm',
          weight: 'bold',
          color: COLORS.primaryText,
        },
        {
          type: 'text',
          text: weakSubjectNote,
          size: 'sm',
          color: COLORS.secondaryText,
          wrap: true,
          margin: 'xs',
        },
      ],
      margin: 'md',
      paddingAll: '10px',
      backgroundColor: COLORS.white,
      cornerRadius: '8px',
    });
  }

  const footerButtons: FlexComponent[] = [
    {
      type: 'button',
      action: {
        type: detailUrl ? 'uri' : 'message',
        label: '了解詳情',
        ...(detailUrl
          ? { uri: detailUrl }
          : { text: `了解${courseName}的詳情` }),
      },
      style: 'primary',
      color: COLORS.accentGreen,
      height: 'sm',
      flex: 1,
    },
    {
      type: 'button',
      action: {
        type: trialUrl ? 'uri' : 'message',
        label: '預約試聽',
        ...(trialUrl
          ? { uri: trialUrl }
          : { text: `我想預約${courseName}的試聽` }),
      },
      style: 'secondary',
      height: 'sm',
      flex: 1,
    },
  ];

  return {
    type: 'flex',
    altText: `🎯 課程推薦：${courseName}`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: headerBox('🎯 推薦課程'),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '16px',
        backgroundColor: COLORS.lightBg,
        spacing: 'sm',
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        contents: footerButtons,
        spacing: 'sm',
        paddingAll: '12px',
        backgroundColor: COLORS.white,
      },
      styles: {
        footer: { separator: true },
      },
    },
  };
}

/**
 * 多筆課程推薦輪播（Carousel）
 */
export function recommendationCarousel(items: RecommendationCardData[]): LineFlexMessage {
  if (items.length === 0) {
    return recommendationCard({
      courseName: '暫無推薦課程',
      teacherName: '—',
      fee: 0,
    });
  }

  // Single item — return bubble directly
  if (items.length === 1) {
    return recommendationCard(items[0]!);
  }

  const bubbles: FlexBubble[] = items.map((item) => {
    const msg = recommendationCard(item);
    return msg.contents as FlexBubble;
  });

  return {
    type: 'flex',
    altText: '🎯 為您推薦的課程',
    contents: {
      type: 'carousel',
      contents: bubbles,
    },
  };
}

// ─── 4. 出勤通知卡片 ──────────────────────────────────────────────────────────

export type AttendanceStatus =
  | 'present'   // 到課
  | 'absent'    // 缺席
  | 'late'      // 遲到
  | 'leave'     // 請假
  | 'unknown';

export interface AttendanceCardData {
  studentName: string;
  checkInTime: string;   // e.g. '19:02'
  date: string;          // e.g. '2026-03-03'
  status: AttendanceStatus;
  courseName?: string;
  note?: string;
}

const ATTENDANCE_STATUS_MAP: Record<
  AttendanceStatus,
  { label: string; emoji: string; badgeColor: string }
> = {
  present: { label: '已到課',   emoji: '✅', badgeColor: COLORS.badgeGreen },
  absent:  { label: '缺席',     emoji: '❌', badgeColor: COLORS.badgeRed   },
  late:    { label: '遲到',     emoji: '⏰', badgeColor: COLORS.accentOrange },
  leave:   { label: '請假',     emoji: '📝', badgeColor: COLORS.badgeGray  },
  unknown: { label: '未知狀態', emoji: '❓', badgeColor: COLORS.badgeGray  },
};

/**
 * 出勤通知卡片
 * 主動推播用（由系統在學生簽到時發送給家長）
 */
export function attendanceCard(data: AttendanceCardData): LineFlexMessage {
  const { studentName, checkInTime, date, status, courseName, note } = data;
  const statusInfo = ATTENDANCE_STATUS_MAP[status];

  const bodyContents: FlexComponent[] = [
    // Status badge row
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${statusInfo.emoji} ${statusInfo.label}`,
          size: 'lg',
          weight: 'bold',
          color: statusInfo.badgeColor,
          flex: 1,
        },
      ],
      margin: 'none',
    },
    separator(),
    labelValueRow('學生姓名', studentName),
    labelValueRow('日期',     date),
    labelValueRow('簽到時間', checkInTime),
  ];

  if (courseName) {
    bodyContents.push(labelValueRow('課程', courseName));
  }

  if (note) {
    bodyContents.push(separator());
    bodyContents.push({
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `📌 備註：${note}`,
          size: 'sm',
          color: COLORS.secondaryText,
          wrap: true,
        },
      ],
      margin: 'md',
      paddingAll: '10px',
      backgroundColor: COLORS.white,
      cornerRadius: '8px',
    });
  }

  const headerTitle =
    status === 'present' ? `✅ ${studentName} 已到課` :
    status === 'absent'  ? `❌ ${studentName} 缺席通知` :
    status === 'late'    ? `⏰ ${studentName} 遲到通知` :
    status === 'leave'   ? `📝 ${studentName} 請假通知` :
    `出勤通知：${studentName}`;

  return {
    type: 'flex',
    altText: headerTitle,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: headerBox(headerTitle),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '16px',
        backgroundColor: COLORS.lightBg,
        spacing: 'sm',
      },
      styles: {
        header: {
          backgroundColor:
            status === 'present' ? COLORS.badgeGreen :
            status === 'absent'  ? COLORS.badgeRed   :
            status === 'late'    ? COLORS.accentOrange :
            COLORS.headerBg,
        },
      },
    },
  };
}

// ─── 轉換工具 ────────────────────────────────────────────────────────────────

/**
 * 將 LINE Flex Message 轉成純文字摘要（Telegram fallback 用）
 */
export function flexToPlainText(flex: LineFlexMessage): string {
  return flex.altText;
}
