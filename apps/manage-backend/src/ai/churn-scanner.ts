/**
 * 流失預警自動掃描系統
 * 提供每日掃描、週報摘要、風險變化追蹤功能
 */

import { db } from '../db';
import { calculateBranchChurnRisks, ChurnRiskScore, RiskLevel } from './churn-v2';
import { startOfDay, subDays, subWeeks } from 'date-fns';

// ============ 型別定義 ============

export interface DailyScanReport {
  branchId: string;
  branchName: string;
  scanDate: Date;
  totalStudents: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  topRisks: ChurnRiskScore[]; // 前 10 名高風險學生
  newRisks: RiskChange[];     // 新增風險學生
  escalations: RiskChange[];  // 風險升級學生
  summary: string;
}

export interface RiskChange {
  studentId: string;
  studentName: string;
  previousLevel: RiskLevel | null;
  currentLevel: RiskLevel;
  previousScore: number | null;
  currentScore: number;
  changeReason: string;
}

export interface WeeklyDigest {
  branchId: string;
  branchName: string;
  weekStart: Date;
  weekEnd: Date;
  newRisks: RiskChange[];
  removedRisks: RiskChange[];
  escalations: RiskChange[];
  deescalations: RiskChange[];
  trends: {
    averageRiskScore: number;
    weekOverWeekChange: number;
    criticalCount: number;
    criticalCountChange: number;
  };
  summary: string;
}

interface HistoricalRisk {
  studentId: string;
  riskLevel: RiskLevel;
  totalScore: number;
  scanDate: Date;
}

// ============ 風險歷史記錄 ============

/**
 * 儲存掃描結果到資料庫
 */
async function saveChurnScanResults(
  branchId: string,
  risks: ChurnRiskScore[]
): Promise<void> {
  const scanDate = new Date();

  // 批次插入風險記錄
  await db.churnRiskHistory.createMany({
    data: risks.map(risk => ({
      branchId,
      studentId: risk.studentId,
      riskLevel: risk.riskLevel,
      totalScore: risk.totalScore,
      dimensions: JSON.stringify(risk.dimensions),
      recommendations: JSON.stringify(risk.actionRecommendations),
      scanDate,
    })),
  });
}

/**
 * 取得上次掃描的風險資料
 */
async function getPreviousRisks(
  branchId: string,
  daysAgo: number = 1
): Promise<Map<string, HistoricalRisk>> {
  const targetDate = startOfDay(subDays(new Date(), daysAgo));

  const previousRecords = await db.churnRiskHistory.findMany({
    where: {
      branchId,
      scanDate: {
        gte: targetDate,
        lt: startOfDay(subDays(new Date(), daysAgo - 1)),
      },
    },
    orderBy: { scanDate: 'desc' },
  });

  const riskMap = new Map<string, HistoricalRisk>();
  previousRecords.forEach(record => {
    if (!riskMap.has(record.studentId)) {
      riskMap.set(record.studentId, {
        studentId: record.studentId,
        riskLevel: record.riskLevel as RiskLevel,
        totalScore: record.totalScore,
        scanDate: record.scanDate,
      });
    }
  });

  return riskMap;
}

// ============ 風險變化分析 ============

/**
 * 偵測新增風險學生（之前無風險或分數<50，現在≥50）
 */
function detectNewRisks(
  currentRisks: ChurnRiskScore[],
  previousRisks: Map<string, HistoricalRisk>
): RiskChange[] {
  const newRisks: RiskChange[] = [];

  currentRisks.forEach(current => {
    if (current.totalScore < 50) return; // 只關注 medium 以上

    const previous = previousRisks.get(current.studentId);

    if (!previous || previous.totalScore < 50) {
      newRisks.push({
        studentId: current.studentId,
        studentName: current.studentName,
        previousLevel: previous?.riskLevel ?? null,
        currentLevel: current.riskLevel,
        previousScore: previous?.totalScore ?? null,
        currentScore: current.totalScore,
        changeReason: previous
          ? `風險分數從 ${previous.totalScore} 升至 ${current.totalScore}`
          : '首次進入風險名單',
      });
    }
  });

  return newRisks;
}

/**
 * 偵測風險升級（medium→high, high→critical）
 */
function detectEscalations(
  currentRisks: ChurnRiskScore[],
  previousRisks: Map<string, HistoricalRisk>
): RiskChange[] {
  const escalations: RiskChange[] = [];
  const riskLevelOrder: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  currentRisks.forEach(current => {
    const previous = previousRisks.get(current.studentId);
    if (!previous) return;

    const currentOrder = riskLevelOrder[current.riskLevel];
    const previousOrder = riskLevelOrder[previous.riskLevel];

    if (currentOrder > previousOrder) {
      escalations.push({
        studentId: current.studentId,
        studentName: current.studentName,
        previousLevel: previous.riskLevel,
        currentLevel: current.riskLevel,
        previousScore: previous.totalScore,
        currentScore: current.totalScore,
        changeReason: `風險等級從 ${previous.riskLevel} 升級至 ${current.riskLevel}`,
      });
    }
  });

  return escalations;
}

/**
 * 偵測風險降級
 */
function detectDeescalations(
  currentRisks: ChurnRiskScore[],
  previousRisks: Map<string, HistoricalRisk>
): RiskChange[] {
  const deescalations: RiskChange[] = [];
  const riskLevelOrder: Record<RiskLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3,
  };

  currentRisks.forEach(current => {
    const previous = previousRisks.get(current.studentId);
    if (!previous) return;

    const currentOrder = riskLevelOrder[current.riskLevel];
    const previousOrder = riskLevelOrder[previous.riskLevel];

    if (currentOrder < previousOrder) {
      deescalations.push({
        studentId: current.studentId,
        studentName: current.studentName,
        previousLevel: previous.riskLevel,
        currentLevel: current.riskLevel,
        previousScore: previous.totalScore,
        currentScore: current.totalScore,
        changeReason: `風險等級從 ${previous.riskLevel} 降至 ${current.riskLevel}`,
      });
    }
  });

  return deescalations;
}

/**
 * 偵測移除風險（之前≥50，現在<50）
 */
function detectRemovedRisks(
  currentRisks: ChurnRiskScore[],
  previousRisks: Map<string, HistoricalRisk>
): RiskChange[] {
  const removedRisks: RiskChange[] = [];
  const currentRiskIds = new Set(currentRisks.map(r => r.studentId));

  previousRisks.forEach((previous, studentId) => {
    if (previous.totalScore < 50) return;

    const current = currentRisks.find(r => r.studentId === studentId);

    if (!current || current.totalScore < 50) {
      removedRisks.push({
        studentId,
        studentName: current?.studentName ?? '(已離校)',
        previousLevel: previous.riskLevel,
        currentLevel: current?.riskLevel ?? 'low',
        previousScore: previous.totalScore,
        currentScore: current?.totalScore ?? 0,
        changeReason: current
          ? `風險分數降至 ${current.totalScore}，脫離風險名單`
          : '學生已離校或無資料',
      });
    }
  });

  return removedRisks;
}

// ============ 每日掃描 ============

/**
 * 執行每日風險掃描
 */
export async function dailyScan(branchId: string): Promise<DailyScanReport> {
  // 取得分校資訊
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { name: true },
  });

  if (!branch) {
    throw new Error(`Branch ${branchId} not found`);
  }

  // 計算所有學生風險
  const risks = await calculateBranchChurnRisks(branchId);

  // 儲存結果
  await saveChurnScanResults(branchId, risks);

  // 取得昨天的風險資料
  const previousRisks = await getPreviousRisks(branchId, 1);

  // 分析變化
  const newRisks = detectNewRisks(risks, previousRisks);
  const escalations = detectEscalations(risks, previousRisks);

  // 統計風險分布
  const riskDistribution = {
    critical: risks.filter(r => r.riskLevel === 'critical').length,
    high: risks.filter(r => r.riskLevel === 'high').length,
    medium: risks.filter(r => r.riskLevel === 'medium').length,
    low: risks.filter(r => r.riskLevel === 'low').length,
  };

  // 產生摘要
  const summary = generateDailySummary(
    branch.name,
    risks.length,
    riskDistribution,
    newRisks.length,
    escalations.length
  );

  return {
    branchId,
    branchName: branch.name,
    scanDate: new Date(),
    totalStudents: risks.length,
    riskDistribution,
    topRisks: risks.slice(0, 10), // 前 10 名
    newRisks,
    escalations,
    summary,
  };
}

function generateDailySummary(
  branchName: string,
  totalStudents: number,
  distribution: DailyScanReport['riskDistribution'],
  newCount: number,
  escalationCount: number
): string {
  const parts: string[] = [
    `📊 ${branchName} 每日風險掃描報告`,
    `總學生數：${totalStudents}`,
    `風險分布：🔴 ${distribution.critical} 位極高風險 | 🟠 ${distribution.high} 位高風險 | 🟡 ${distribution.medium} 位中風險`,
  ];

  if (newCount > 0) {
    parts.push(`⚠️ 新增 ${newCount} 位風險學生`);
  }

  if (escalationCount > 0) {
    parts.push(`📈 ${escalationCount} 位學生風險升級`);
  }

  if (distribution.critical > 0) {
    parts.push(`🚨 請優先關注 ${distribution.critical} 位極高風險學生`);
  }

  return parts.join('\n');
}

// ============ 週報摘要 ============

/**
 * 產生週報摘要
 */
export async function weeklyDigest(branchId: string): Promise<WeeklyDigest> {
  const branch = await db.branch.findUnique({
    where: { id: branchId },
    select: { name: true },
  });

  if (!branch) {
    throw new Error(`Branch ${branchId} not found`);
  }

  // 本週風險
  const currentRisks = await calculateBranchChurnRisks(branchId);

  // 上週風險
  const previousRisks = await getPreviousRisks(branchId, 7);

  // 分析各類變化
  const newRisks = detectNewRisks(currentRisks, previousRisks);
  const removedRisks = detectRemovedRisks(currentRisks, previousRisks);
  const escalations = detectEscalations(currentRisks, previousRisks);
  const deescalations = detectDeescalations(currentRisks, previousRisks);

  // 計算趨勢
  const currentAvg =
    currentRisks.reduce((sum, r) => sum + r.totalScore, 0) / currentRisks.length;

  const previousScores = Array.from(previousRisks.values());
  const previousAvg =
    previousScores.length > 0
      ? previousScores.reduce((sum, r) => sum + r.totalScore, 0) / previousScores.length
      : 0;

  const currentCritical = currentRisks.filter(r => r.riskLevel === 'critical').length;
  const previousCritical = previousScores.filter(r => r.riskLevel === 'critical').length;

  const weekStart = subWeeks(new Date(), 1);
  const weekEnd = new Date();

  const summary = generateWeeklySummary(
    branch.name,
    {
      newRisks: newRisks.length,
      removedRisks: removedRisks.length,
      escalations: escalations.length,
      avgChange: currentAvg - previousAvg,
      criticalChange: currentCritical - previousCritical,
    }
  );

  return {
    branchId,
    branchName: branch.name,
    weekStart,
    weekEnd,
    newRisks,
    removedRisks,
    escalations,
    deescalations,
    trends: {
      averageRiskScore: Math.round(currentAvg),
      weekOverWeekChange: Math.round(currentAvg - previousAvg),
      criticalCount: currentCritical,
      criticalCountChange: currentCritical - previousCritical,
    },
    summary,
  };
}

function generateWeeklySummary(
  branchName: string,
  stats: {
    newRisks: number;
    removedRisks: number;
    escalations: number;
    avgChange: number;
    criticalChange: number;
  }
): string {
  const parts: string[] = [`📅 ${branchName} 週報摘要`];

  if (stats.newRisks > 0) {
    parts.push(`📥 新增 ${stats.newRisks} 位風險學生`);
  }

  if (stats.removedRisks > 0) {
    parts.push(`📤 ${stats.removedRisks} 位學生脫離風險名單`);
  }

  if (stats.escalations > 0) {
    parts.push(`⚠️ ${stats.escalations} 位學生風險升級`);
  }

  if (stats.avgChange > 5) {
    parts.push(`📈 整體風險趨勢上升 (+${stats.avgChange.toFixed(1)} 分)`);
  } else if (stats.avgChange < -5) {
    parts.push(`📉 整體風險趨勢下降 (${stats.avgChange.toFixed(1)} 分)`);
  }

  if (stats.criticalChange > 0) {
    parts.push(`🚨 極高風險學生增加 ${stats.criticalChange} 位`);
  } else if (stats.criticalChange < 0) {
    parts.push(`✅ 極高風險學生減少 ${Math.abs(stats.criticalChange)} 位`);
  }

  return parts.join('\n');
}

// ============ 單一學生風險歷史 ============

/**
 * 取得學生風險歷史趨勢（過去 30 天）
 */
export async function getStudentRiskHistory(
  studentId: string,
  days: number = 30
): Promise<HistoricalRisk[]> {
  const since = subDays(new Date(), days);

  const records = await db.churnRiskHistory.findMany({
    where: {
      studentId,
      scanDate: { gte: since },
    },
    orderBy: { scanDate: 'asc' },
    select: {
      studentId: true,
      riskLevel: true,
      totalScore: true,
      scanDate: true,
    },
  });

  return records.map(r => ({
    studentId: r.studentId,
    riskLevel: r.riskLevel as RiskLevel,
    totalScore: r.totalScore,
    scanDate: r.scanDate,
  }));
}
