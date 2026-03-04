/**
 * AI 弱點分析服務 - 使用 Gemini 分析學生成績
 */
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

interface ScoreData {
  subject: string
  score: string
  classAvg?: string | null
  fullScore: string | null
  date: string
}

interface AnalysisResult {
  weaknessSummary: string
  recommendedCourseName: string
  recommendedCourseDesc: string
}

export async function analyzeStudentWeakness(
  studentName: string,
  scores: ScoreData[]
): Promise<AnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const scoreText = scores
    .map(
      (s) =>
        `- ${s.date} ${s.subject}: ${s.score}/${s.fullScore ?? '?'}${s.classAvg ? ` (班級平均: ${s.classAvg})` : ''}`
    )
    .join('\n')

  const prompt = `你是一位資深補習班教學顧問。請根據以下學生近期考試成績，分析學習弱點並推薦補強方向。

學生姓名：${studentName}
近期成績：
${scoreText}

請以 JSON 格式回傳（不要包含 markdown code block）：
{
  "weaknessSummary": "弱點分析摘要（100字以內）",
  "recommendedCourseName": "推薦課程名稱",
  "recommendedCourseDesc": "推薦課程說明（80字以內）"
}

如果成績資料不足以分析，請回傳合理的通用建議。`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  try {
    const jsonStr = text
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(jsonStr) as Partial<AnalysisResult>

    return {
      weaknessSummary: parsed.weaknessSummary ?? '暫無分析',
      recommendedCourseName: parsed.recommendedCourseName ?? '基礎加強班',
      recommendedCourseDesc: parsed.recommendedCourseDesc ?? '建議加強基礎訓練',
    }
  } catch {
    return {
      weaknessSummary: '暫無分析',
      recommendedCourseName: '基礎加強班',
      recommendedCourseDesc: '建議加強基礎訓練',
    }
  }
}
