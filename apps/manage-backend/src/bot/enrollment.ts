// src/bot/enrollment.ts - 招生對話引擎
import { Context } from 'grammy';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger'
import { getRedis } from '@94cram/shared/redis'

// ==================== 類型定義 ====================

export enum EnrollmentState {
  GREETING = 'greeting',
  NEED_ANALYSIS = 'need_analysis',
  COURSE_RECOMMEND = 'course_recommend',
  TRIAL_BOOKING = 'trial_booking',
  FOLLOW_UP = 'follow_up',
  COMPLETED = 'completed'
}

interface ConversationContext {
  chatId: number;
  state: EnrollmentState;
  data: {
    parentName?: string;
    phone?: string;
    studentName?: string;
    studentGrade?: string;
    interestSubjects?: string[];
    preferredTime?: string;
    trialDate?: string;
    trialTime?: string;
  };
  lastActivity: Date;
  messageHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

// ==================== 全域狀態管理 ====================

const conversations = new Map<number, ConversationContext>();
const TIMEOUT_MS = 30 * 60 * 1000; // 30 分鐘

// ==================== Redis 同步 ====================

function syncConvToRedis(chatId: number) {
  const redis = getRedis()
  const conv = conversations.get(chatId)
  if (!redis || !conv) return
  redis.set(`enroll:conv:${chatId}`, JSON.stringify(conv), { ex: 1800 }).catch(() => {})
}

// ==================== AI AI 初始化 ====================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ==================== 課程資料庫（範例） ====================

interface Course {
  name: string;
  grades: string[];
  subjects: string[];
  price: number;
  description: string;
}

const COURSES: Course[] = [
  {
    name: '國小精緻小班',
    grades: ['小三', '小四', '小五', '小六'],
    subjects: ['國文', '數學', '英文'],
    price: 3500,
    description: '6人小班制，互動式教學，奠定基礎'
  },
  {
    name: '國中全科班',
    grades: ['國一', '國二', '國三'],
    subjects: ['國文', '英文', '數學', '自然', '社會'],
    price: 5800,
    description: '會考導向，系統化複習，提升競爭力'
  },
  {
    name: '高中升學班',
    grades: ['高一', '高二', '高三'],
    subjects: ['國文', '英文', '數學', '物理', '化學'],
    price: 7200,
    description: '學測、分科測驗專攻，名師授課'
  },
  {
    name: '英文會話班',
    grades: ['小四', '小五', '小六', '國一', '國二', '國三'],
    subjects: ['英文'],
    price: 2800,
    description: '外師互動，情境式學習，提升口說自信'
  }
];

// ==================== 試聽時段 ====================

const TRIAL_SLOTS = [
  '週一 18:00-19:30',
  '週二 18:00-19:30',
  '週三 18:00-19:30',
  '週四 18:00-19:30',
  '週五 18:00-19:30',
  '週六 09:00-10:30',
  '週六 14:00-15:30',
  '週日 09:00-10:30',
  '週日 14:00-15:30'
];

// ==================== 核心函式 ====================

/**
 * 獲取或創建對話上下文
 */
function getConversation(chatId: number): ConversationContext {
  if (!conversations.has(chatId)) {
    conversations.set(chatId, {
      chatId,
      state: EnrollmentState.GREETING,
      data: {},
      lastActivity: new Date(),
      messageHistory: []
    });
  }
  
  const conv = conversations.get(chatId)!;
  conv.lastActivity = new Date();
  return conv;
}

/**
 * 更新對話狀態
 */
function updateState(chatId: number, newState: EnrollmentState, data?: Partial<ConversationContext['data']>) {
  const conv = getConversation(chatId);
  conv.state = newState;
  if (data) {
    conv.data = { ...conv.data, ...data };
  }
  syncConvToRedis(chatId);
}

/**
 * 新增訊息到對話歷史
 */
function addMessage(chatId: number, role: 'user' | 'assistant', content: string) {
  const conv = getConversation(chatId);
  conv.messageHistory.push({ role, content });

  // 保留最近 20 條訊息
  if (conv.messageHistory.length > 20) {
    conv.messageHistory = conv.messageHistory.slice(-20);
  }
  syncConvToRedis(chatId);
}

/**
 * 使用 AI 生成自然回應
 */
async function generateNaturalResponse(
  systemPrompt: string,
  userMessage: string,
  context?: string
): Promise<string> {
  try {
    const prompt = `${systemPrompt}

${context ? `對話脈絡：\n${context}\n` : ''}
使用者訊息：${userMessage}

請用溫暖、專業、親切的語氣回應，使用繁體中文。`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    logger.error({ err: error }, 'AI API 錯誤:');
    return '不好意思，我需要一點時間整理思緒，請稍後再試一次 😊';
  }
}

/**
 * 提取資訊（使用 AI）
 */
async function extractInfo(text: string, infoType: string): Promise<string | null> {
  try {
    const prompt = `從以下文字中提取「${infoType}」，只回傳提取到的內容，如果沒有就回傳 null：

文字：${text}

規則：
- 年級：轉換為「小三」「國一」「高二」等格式
- 科目：提取所有提到的科目名稱，用逗號分隔
- 姓名：提取人名
- 電話：提取手機號碼
- 時間：提取時間偏好

只回傳提取結果，不要解釋。`;

    const result = await model.generateContent(prompt);
    const response = result.response.text().trim();
    return response === 'null' ? null : response;
  } catch (error) {
    return null;
  }
}

/**
 * 推薦課程
 */
function recommendCourses(grade?: string, subjects?: string[]): Course[] {
  let matched = COURSES;
  
  if (grade) {
    matched = matched.filter(c => c.grades.includes(grade));
  }
  
  if (subjects && subjects.length > 0) {
    matched = matched.filter(c => 
      subjects.some(sub => c.subjects.includes(sub))
    );
  }
  
  return matched.slice(0, 3); // 最多推薦 3 個
}

/**
 * 格式化課程推薦訊息
 */
function formatCourseRecommendation(courses: Course[]): string {
  if (courses.length === 0) {
    return '根據您的需求，我們可以為您量身打造客製化課程。讓我們的教育顧問與您進一步討論！';
  }
  
  let message = '📚 **根據您的需求，我為您推薦以下課程：**\n\n';
  
  courses.forEach((course, idx) => {
    message += `**${idx + 1}. ${course.name}**\n`;
    message += `   📖 科目：${course.subjects.join('、')}\n`;
    message += `   🎓 適合年級：${course.grades.join('、')}\n`;
    message += `   💰 學費：NT$ ${course.price.toLocaleString()}/月\n`;
    message += `   ℹ️ ${course.description}\n\n`;
  });
  
  message += '您對哪個課程有興趣呢？或是想了解更多細節？ 😊';
  
  return message;
}

/**
 * 建立 Lead 記錄
 */
async function createLead(data: ConversationContext['data']): Promise<boolean> {
  try {
    // 這裡應該呼叫你的資料庫 API
    logger.info('Creating lead:', data);
    
    // 實際應該是：
    // await fetch('http://localhost:3100/api/admin/leads', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     name: data.parentName,
    //     phone: data.phone,
    //     student_name: data.studentName,
    //     student_grade: data.studentGrade,
    //     interest_subjects: data.interestSubjects?.join(','),
    //     status: 'trial_scheduled',
    //     follow_up_date: data.trialDate
    //   })
    // });
    
    return true;
  } catch (error) {
    logger.error({ err: error }, '建立 lead 失敗:');
    return false;
  }
}

// ==================== 狀態處理器 ====================

/**
 * GREETING 狀態
 */
async function handleGreeting(ctx: Context, conv: ConversationContext, userMessage: string) {
  const response = await generateNaturalResponse(
    `你是蜂神榜補習班的招生顧問。家長剛開始諮詢，請熱情歡迎並詢問孩子的基本資訊（姓名、年級）。`,
    userMessage
  );
  
  await ctx.reply(response);
  addMessage(conv.chatId, 'assistant', response);
  
  // 嘗試提取資訊
  const grade = await extractInfo(userMessage, '年級');
  const studentName = await extractInfo(userMessage, '孩子姓名');
  
  if (grade || studentName) {
    updateState(conv.chatId, EnrollmentState.NEED_ANALYSIS, { 
      studentGrade: grade || undefined,
      studentName: studentName || undefined
    });
  }
}

/**
 * NEED_ANALYSIS 狀態
 */
async function handleNeedAnalysis(ctx: Context, conv: ConversationContext, userMessage: string) {
  // 提取資訊
  const grade = await extractInfo(userMessage, '年級');
  const subjects = await extractInfo(userMessage, '科目');
  const parentName = await extractInfo(userMessage, '家長姓名');
  const phone = await extractInfo(userMessage, '電話');
  
  const updates: Partial<ConversationContext['data']> = {};
  if (grade) updates.studentGrade = grade;
  if (subjects) updates.interestSubjects = subjects.split(/[,、，]/);
  if (parentName) updates.parentName = parentName;
  if (phone) updates.phone = phone;
  
  updateState(conv.chatId, EnrollmentState.NEED_ANALYSIS, updates);
  
  // 檢查是否收集足夠資訊
  const hasEnoughInfo = conv.data.studentGrade && conv.data.interestSubjects;
  
  if (hasEnoughInfo) {
    // 推薦課程
    const courses = recommendCourses(conv.data.studentGrade, conv.data.interestSubjects);
    const recommendation = formatCourseRecommendation(courses);
    
    await ctx.reply(recommendation, { parse_mode: 'Markdown' });
    addMessage(conv.chatId, 'assistant', recommendation);
    
    updateState(conv.chatId, EnrollmentState.COURSE_RECOMMEND);
  } else {
    // 繼續詢問
    const contextInfo = `已知資訊：年級=${conv.data.studentGrade || '未知'}，科目=${conv.data.interestSubjects?.join('、') || '未知'}`;
    const response = await generateNaturalResponse(
      `你是招生顧問，正在了解需求。請詢問還缺少的資訊（年級、想加強的科目）。`,
      userMessage,
      contextInfo
    );
    
    await ctx.reply(response);
    addMessage(conv.chatId, 'assistant', response);
  }
}

/**
 * COURSE_RECOMMEND 狀態
 */
async function handleCourseRecommend(ctx: Context, conv: ConversationContext, userMessage: string) {
  const lowerMessage = userMessage.toLowerCase();
  
  // 檢查是否想預約試聽
  if (lowerMessage.includes('試聽') || lowerMessage.includes('預約') || lowerMessage.includes('體驗')) {
    const slotsMessage = `太好了！我們提供免費試聽課程 🎉\n\n請選擇方便的時段：\n\n${TRIAL_SLOTS.map((slot, idx) => `${idx + 1}. ${slot}`).join('\n')}\n\n請告訴我編號或直接說明您偏好的時間 😊`;
    
    await ctx.reply(slotsMessage);
    addMessage(conv.chatId, 'assistant', slotsMessage);
    
    updateState(conv.chatId, EnrollmentState.TRIAL_BOOKING);
  } else {
    // 繼續討論課程細節
    const contextInfo = `學生年級：${conv.data.studentGrade}，興趣科目：${conv.data.interestSubjects?.join('、')}`;
    const response = await generateNaturalResponse(
      `你是招生顧問，正在介紹課程。家長可能在詢問課程細節、師資、教材等。請專業回答並引導預約試聽。`,
      userMessage,
      contextInfo
    );
    
    await ctx.reply(response);
    addMessage(conv.chatId, 'assistant', response);
  }
}

/**
 * TRIAL_BOOKING 狀態
 */
async function handleTrialBooking(ctx: Context, conv: ConversationContext, userMessage: string) {
  // 提取時間選擇
  const timeMatch = userMessage.match(/(\d+)|週[一二三四五六日]|星期[一二三四五六日]/);
  
  let selectedSlot: string | null = null;
  
  if (timeMatch) {
    const num = parseInt(timeMatch[1]);
    if (!isNaN(num) && num >= 1 && num <= TRIAL_SLOTS.length) {
      selectedSlot = TRIAL_SLOTS[num - 1];
    }
  }
  
  // 也嘗試用 AI 提取時間
  if (!selectedSlot) {
    selectedSlot = await extractInfo(userMessage, '選擇的試聽時段');
  }
  
  if (selectedSlot) {
    // 確認預約
    updateState(conv.chatId, EnrollmentState.FOLLOW_UP, { 
      trialTime: selectedSlot,
      trialDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 暫定 7 天後
    });
    
    // 建立 lead
    await createLead(conv.data);
    
    const confirmMessage = `✅ **預約成功！**\n\n📅 試聽時段：${selectedSlot}\n👤 學生姓名：${conv.data.studentName || '（請補充）'}\n📱 聯絡電話：${conv.data.phone || '（請補充）'}\n\n我們會在試聽前一天提醒您！\n如需更改時間或有任何問題，隨時聯絡我們 😊\n\n期待與您見面！`;
    
    await ctx.reply(confirmMessage, { parse_mode: 'Markdown' });
    addMessage(conv.chatId, 'assistant', confirmMessage);
    
    // 如果缺少資訊，詢問
    if (!conv.data.parentName || !conv.data.phone) {
      const infoRequest = '順帶一提，方便留下您的大名和聯絡電話嗎？這樣我們可以更好地為您服務 📞';
      await ctx.reply(infoRequest);
      addMessage(conv.chatId, 'assistant', infoRequest);
    }
  } else {
    // 無法識別時段
    const clarify = '不好意思，我沒聽懂您選擇的時段 😅\n請直接告訴我編號（1-9）或是說明您方便的時間，我會盡量安排！';
    await ctx.reply(clarify);
    addMessage(conv.chatId, 'assistant', clarify);
  }
}

/**
 * FOLLOW_UP 狀態
 */
async function handleFollowUp(ctx: Context, conv: ConversationContext, userMessage: string) {
  // 補充資訊或回答後續問題
  const phone = await extractInfo(userMessage, '電話');
  const parentName = await extractInfo(userMessage, '姓名');
  
  if (phone || parentName) {
    updateState(conv.chatId, EnrollmentState.FOLLOW_UP, {
      phone: phone || conv.data.phone,
      parentName: parentName || conv.data.parentName
    });
    
    const thanks = '感謝您提供資訊！我們已經完成預約登記。\n如果有任何問題，隨時找我聊天喔 💬';
    await ctx.reply(thanks);
    addMessage(conv.chatId, 'assistant', thanks);
  } else {
    // 一般對話
    const response = await generateNaturalResponse(
      `你是招生顧問，試聽已預約。請親切回答家長的後續問題。`,
      userMessage
    );
    
    await ctx.reply(response);
    addMessage(conv.chatId, 'assistant', response);
  }
}

// ==================== 主要處理函式 ====================

/**
 * 處理招生對話
 */
export async function handleEnrollmentConversation(ctx: Context) {
  const chatId = ctx.chat?.id;
  const userMessage = (ctx.message as { text?: string })?.text;
  
  if (!chatId || !userMessage) return;
  
  const conv = getConversation(chatId);
  addMessage(chatId, 'user', userMessage);
  
  // 檢查超時
  const timeSinceLastActivity = Date.now() - conv.lastActivity.getTime();
  if (timeSinceLastActivity > TIMEOUT_MS && conv.state !== EnrollmentState.GREETING) {
    const reminder = '好久不見！我們之前聊到哪了呢？\n如果需要重新開始，隨時告訴我 😊';
    await ctx.reply(reminder);
    addMessage(chatId, 'assistant', reminder);
    return;
  }
  
  // 根據狀態處理
  try {
    switch (conv.state) {
      case EnrollmentState.GREETING:
        await handleGreeting(ctx, conv, userMessage);
        break;
        
      case EnrollmentState.NEED_ANALYSIS:
        await handleNeedAnalysis(ctx, conv, userMessage);
        break;
        
      case EnrollmentState.COURSE_RECOMMEND:
        await handleCourseRecommend(ctx, conv, userMessage);
        break;
        
      case EnrollmentState.TRIAL_BOOKING:
        await handleTrialBooking(ctx, conv, userMessage);
        break;
        
      case EnrollmentState.FOLLOW_UP:
        await handleFollowUp(ctx, conv, userMessage);
        break;
    }
  } catch (error) {
    logger.error({ err: error }, '處理對話錯誤:');
    await ctx.reply('不好意思，系統出了點小狀況，請稍後再試 🙏');
  }
}

/**
 * 重置對話
 */
export function resetConversation(chatId: number) {
  conversations.delete(chatId);
  const redis = getRedis()
  if (redis) redis.del(`enroll:conv:${chatId}`).catch(() => {})
}

/**
 * 獲取所有活躍對話
 */
export function getActiveConversations(): ConversationContext[] {
  return Array.from(conversations.values());
}

// ==================== 超時檢查（定期執行） ====================

export function checkTimeouts() {
  const now = Date.now();
  
  for (const [chatId, conv] of conversations.entries()) {
    const timeSinceLastActivity = now - conv.lastActivity.getTime();
    
    if (timeSinceLastActivity > TIMEOUT_MS && conv.state !== EnrollmentState.COMPLETED) {
      // 這裡可以發送提醒訊息（需要 bot 實例）
      logger.info(`對話超時: ${chatId}, 狀態: ${conv.state}`);
    }
  }
}

// 每 10 分鐘檢查一次
setInterval(checkTimeouts, 10 * 60 * 1000);
