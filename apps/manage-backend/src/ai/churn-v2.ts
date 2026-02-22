/**
 * 流失預警系統 v2 - 升級版預測引擎
 * 6 維度風險評估：出席率、出席趨勢、成績變化、連續缺席、繳費延遲、互動頻率
 */

import { db } from '../db';
import { subWeeks, subMonths, isAfter, differenceInDays } from 'date-fns';

// ============ 型別定義 ============

export interface ChurnDimension {
  name: string;
  score: number;  // 0-100
  weight: number; // 權重
  detail: string; // 說明
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface ChurnRiskScore {
  studentId: string;
  studentName: string;
  totalScore: number; // 0-100 加權總分
  riskLevel: RiskLevel;
  dimensions: ChurnDimension[];
  actionRecommendations: string[];
  calculatedAt: Date;
}

export interface TimeWindow {
  recent: Date;  // 近 2 週
  baseline: Date; // 近 2 月
}

interface AttendanceData {
  recentRate: number;   // 近 2 週出席率
  baselineRate: number; // 近 2 月出席率
  trend: number;        // 趨勢變化 (-100 ~ +100)
  consecutiveAbsences: number;
}

interface GradeData {
  recentAvg: number;
  baselineAvg: number;
  changePercent: number;
}

interface PaymentData {
  overdueCount: number;
  latestOverdueDays: number;
}

interface InteractionData {
  recentCount: number;
  baselineCount: number;
}

// ============ 時間窗口計算 ============

export function getTimeWindows(): TimeWindow {
  const now = new Date();
  return {
    recent: subWeeks(now, 2),
    baseline: subMonths(now, 2),
  };
}

// ============ 資料收集函數 ============

/**
 * 收集學生出席資料
 */
async function getAttendanceData(
  studentId: string,
  windows: TimeWindow
): Promise<AttendanceData> {
  // 近 2 週的出席記錄
  const recentAttendances = await db.attendance.findMany({
    where: {
      studentId,
      date: { gte: windows.recent },
    },
  });

  // 近 2 月的出席記錄
  const baselineAttendances = await db.attendance.findMany({
    where: {
      studentId,
      date: { gte: windows.baseline },
    },
  });

  const recentTotal = recentAttendances.length;
  const recentPresent = recentAttendances.filter(a => a.status === 'present').length;
  const recentRate = recentTotal > 0 ? (recentPresent / recentTotal) * 100 : 100;

  const baselineTotal = baselineAttendances.length;
  const baselinePresent = baselineAttendances.filter(a => a.status === 'present').length;
  const baselineRate = baselineTotal > 0 ? (baselinePresent / baselineTotal) * 100 : 100;

  const trend = recentRate - baselineRate;

  // 計算連續缺席天數
  const sortedAttendances = [...recentAttendances].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  );
  let consecutiveAbsences = 0;
  for (const attendance of sortedAttendances) {
    if (attendance.status === 'absent') {
      consecutiveAbsences++;
    } else {
      break;
    }
  }

  return {
    recentRate,
    baselineRate,
    trend,
    consecutiveAbsences,
  };
}

/**
 * 收集學生成績資料
 */
async function getGradeData(
  studentId: string,
  windows: TimeWindow
): Promise<GradeData> {
  const recentGrades = await db.grade.findMany({
    where: {
      studentId,
      date: { gte: windows.recent },
    },
  });

  const baselineGrades = await db.grade.findMany({
    where: {
      studentId,
      date: { gte: windows.baseline, lt: windows.recent },
    },
  });

  const calcAvg = (grades: any[]) => {
    if (grades.length === 0) return null;
    const sum = grades.reduce((acc, g) => acc + g.score, 0);
    return sum / grades.length;
  };

  const recentAvg = calcAvg(recentGrades);
  const baselineAvg = calcAvg(baselineGrades);

  let changePercent = 0;
  if (recentAvg !== null && baselineAvg !== null && baselineAvg > 0) {
    changePercent = ((recentAvg - baselineAvg) / baselineAvg) * 100;
  }

  return {
    recentAvg: recentAvg ?? 0,
    baselineAvg: baselineAvg ?? 0,
    changePercent,
  };
}

/**
 * 收集繳費資料
 */
async function getPaymentData(studentId: string): Promise<PaymentData> {
  const now = new Date();
  const overduePayments = await db.payment.findMany({
    where: {
      studentId,
      status: 'overdue',
    },
    orderBy: { dueDate: 'desc' },
  });

  const overdueCount = overduePayments.length;
  const latestOverdueDays = overduePayments.length > 0
    ? differenceInDays(now, overduePayments[0].dueDate)
    : 0;

  return {
    overdueCount,
    latestOverdueDays,
  };
}

/**
 * 收集互動資料（家長聯絡、訊息、回饋等）
 */
async function getInteractionData(
  studentId: string,
  windows: TimeWindow
): Promise<InteractionData> {
  const recentInteractions = await db.interaction.findMany({
    where: {
      studentId,
      date: { gte: windows.recent },
    },
  });

  const baselineInteractions = await db.interaction.findMany({
    where: {
      studentId,
      date: { gte: windows.baseline },
    },
  });

  return {
    recentCount: recentInteractions.length,
    baselineCount: baselineInteractions.length,
  };
}

// ============ 維度評分函數 ============

/**
 * 維度 1: 出席率 (25%)
 * 規則：出席率越低，風險分數越高
 */
function scoreDimension1_AttendanceRate(data: AttendanceData): ChurnDimension {
  const rate = data.recentRate;
  let score = 0;

  if (rate >= 90) score = 0;
  else if (rate >= 80) score = 20;
  else if (rate >= 70) score = 40;
  else if (rate >= 60) score = 60;
  else if (rate >= 50) score = 80;
  else score = 100;

  return {
    name: '出席率',
    score,
    weight: 0.25,
    detail: `近 2 週出席率 ${rate.toFixed(1)}%`,
  };
}

/**
 * 維度 2: 出席趨勢 (20%)
 * 規則：趨勢下降越多，風險越高
 */
function scoreDimension2_AttendanceTrend(data: AttendanceData): ChurnDimension {
  const trend = data.trend;
  let score = 0;

  if (trend >= 0) score = 0;
  else if (trend >= -10) score = 30;
  else if (trend >= -20) score = 60;
  else score = 100;

  const trendText = trend >= 0 ? `上升 ${trend.toFixed(1)}%` : `下降 ${Math.abs(trend).toFixed(1)}%`;

  return {
    name: '出席趨勢',
    score,
    weight: 0.20,
    detail: `相較 2 月前${trendText}`,
  };
}

/**
 * 維度 3: 成績變化 (20%)
 * 規則：成績下降越多，風險越高
 */
function scoreDimension3_GradeChange(data: GradeData): ChurnDimension {
  const change = data.changePercent;
  let score = 0;

  if (change >= 0) score = 0;
  else if (change >= -5) score = 20;
  else if (change >= -10) score = 50;
  else if (change >= -15) score = 80;
  else score = 100;

  let detail = '無成績資料';
  if (data.recentAvg > 0 && data.baselineAvg > 0) {
    detail = change >= 0
      ? `成績進步 ${change.toFixed(1)}%`
      : `成績下降 ${Math.abs(change).toFixed(1)}%`;
  }

  return {
    name: '成績變化',
    score,
    weight: 0.20,
    detail,
  };
}

/**
 * 維度 4: 連續缺席 (15%)
 * 規則：連續缺席越多天，風險越高
 */
function scoreDimension4_ConsecutiveAbsences(data: AttendanceData): ChurnDimension {
  const days = data.consecutiveAbsences;
  let score = 0;

  if (days === 0) score = 0;
  else if (days === 1) score = 20;
  else if (days === 2) score = 50;
  else if (days === 3) score = 80;
  else score = 100;

  return {
    name: '連續缺席',
    score,
    weight: 0.15,
    detail: days > 0 ? `連續 ${days} 次未到` : '無連續缺席',
  };
}

/**
 * 維度 5: 繳費延遲 (10%)
 * 規則：逾期越久、次數越多，風險越高
 */
function scoreDimension5_PaymentDelay(data: PaymentData): ChurnDimension {
  const { overdueCount, latestOverdueDays } = data;
  let score = 0;

  if (overdueCount === 0) {
    score = 0;
  } else if (latestOverdueDays <= 7) {
    score = 30;
  } else if (latestOverdueDays <= 14) {
    score = 60;
  } else {
    score = 100;
  }

  const detail =
    overdueCount === 0
      ? '無逾期紀錄'
      : `${overdueCount} 筆逾期，最久 ${latestOverdueDays} 天`;

  return {
    name: '繳費延遲',
    score,
    weight: 0.10,
    detail,
  };
}

/**
 * 維度 6: 互動頻率 (10%)
 * 規則：互動減少，風險升高
 */
function scoreDimension6_InteractionFrequency(data: InteractionData): ChurnDimension {
  const { recentCount, baselineCount } = data;
  let score = 0;

  const avgBaseline = baselineCount / 8; // 2 個月 = 8 週
  const avgRecent = recentCount / 2;     // 2 週

  if (avgRecent >= avgBaseline) {
    score = 0;
  } else if (avgRecent >= avgBaseline * 0.7) {
    score = 30;
  } else if (avgRecent >= avgBaseline * 0.5) {
    score = 60;
  } else {
    score = 100;
  }

  return {
    name: '互動頻率',
    score,
    weight: 0.10,
    detail: `近 2 週 ${recentCount} 次互動`,
  };
}

// ============ 風險等級判定 ============

function determineRiskLevel(totalScore: number): RiskLevel {
  if (totalScore >= 85) return 'critical';
  if (totalScore >= 70) return 'high';
  if (totalScore >= 50) return 'medium';
  return 'low';
}

// ============ 建議行動生成 ============

function generateActionRecommendations(
  dimensions: ChurnDimension[],
  riskLevel: RiskLevel
): string[] {
  const actions: string[] = [];

  // 根據各維度高分項目產生建議
  dimensions.forEach(dim => {
    if (dim.score >= 80) {
      switch (dim.name) {
        case '出席率':
          actions.push('📞 立即電話聯繫家長，了解缺席原因');
          actions.push('🏠 安排家訪或面談，確認學生狀況');
          break;
        case '出席趨勢':
          actions.push('📊 檢視課程安排是否適合學生');
          actions.push('👨‍🏫 安排導師關懷談話');
          break;
        case '成績變化':
          actions.push('📝 安排額外輔導或補課');
          actions.push('🎯 調整教學方法或難度');
          break;
        case '連續缺席':
          actions.push('🚨 緊急聯繫家長，確認學生安全');
          actions.push('💬 提供請假補課方案');
          break;
        case '繳費延遲':
          actions.push('💰 主動聯繫討論繳費計畫');
          actions.push('🤝 評估是否提供分期或優惠方案');
          break;
        case '互動頻率':
          actions.push('📱 增加與家長的溝通頻率');
          actions.push('✉️ 發送學生學習進度報告');
          break;
      }
    }
  });

  // 根據風險等級添加通用建議
  if (riskLevel === 'critical') {
    actions.push('⚠️ 列為高優先級追蹤對象');
    actions.push('📅 本週內必須完成關懷行動');
  } else if (riskLevel === 'high') {
    actions.push('📌 加入重點關注名單');
    actions.push('🔄 兩週內追蹤改善情況');
  }

  // 去重並限制數量
  return [...new Set(actions)].slice(0, 5);
}

// ============ 主要評估函數 ============

/**
 * 計算單一學生的流失風險分數
 */
export async function calculateChurnRisk(
  studentId: string,
  studentName: string
): Promise<ChurnRiskScore> {
  const windows = getTimeWindows();

  // 收集所有維度資料
  const [attendanceData, gradeData, paymentData, interactionData] = await Promise.all([
    getAttendanceData(studentId, windows),
    getGradeData(studentId, windows),
    getPaymentData(studentId),
    getInteractionData(studentId, windows),
  ]);

  // 計算各維度分數
  const dimensions: ChurnDimension[] = [
    scoreDimension1_AttendanceRate(attendanceData),
    scoreDimension2_AttendanceTrend(attendanceData),
    scoreDimension3_GradeChange(gradeData),
    scoreDimension4_ConsecutiveAbsences(attendanceData),
    scoreDimension5_PaymentDelay(paymentData),
    scoreDimension6_InteractionFrequency(interactionData),
  ];

  // 計算加權總分
  const totalScore = dimensions.reduce(
    (sum, dim) => sum + dim.score * dim.weight,
    0
  );

  const riskLevel = determineRiskLevel(totalScore);
  const actionRecommendations = generateActionRecommendations(dimensions, riskLevel);

  return {
    studentId,
    studentName,
    totalScore: Math.round(totalScore),
    riskLevel,
    dimensions,
    actionRecommendations,
    calculatedAt: new Date(),
  };
}

/**
 * 批次計算分校所有學生的流失風險
 */
export async function calculateBranchChurnRisks(
  branchId: string
): Promise<ChurnRiskScore[]> {
  // 取得分校所有活躍學生
  const students = await db.student.findMany({
    where: {
      branchId,
      status: 'active',
    },
    select: {
      id: true,
      name: true,
    },
  });

  // 並行計算所有學生風險
  const risks = await Promise.all(
    students.map(student => calculateChurnRisk(student.id, student.name))
  );

  // 依風險分數排序（高到低）
  return risks.sort((a, b) => b.totalScore - a.totalScore);
}
