/**
 * AI weakness analysis service - uses Gemini to analyze student scores
 * Lazy-loads @google/generative-ai to avoid heavy import at startup
 */
let genAIInstance: any = null

async function getGenAI() {
  if (!genAIInstance) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai')
    genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  }
  return genAIInstance
}

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
  const genAI = await getGenAI()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const scoreText = scores
    .map(
      (s) =>
        `- ${s.date} ${s.subject}: ${s.score}/${s.fullScore ?? '?'}${s.classAvg ? ` (class avg: ${s.classAvg})` : ''}`
    )
    .join('\n')

  const prompt = `You are a senior tutoring consultant. Analyze the following student's recent exam scores, identify learning weaknesses, and recommend improvement areas.

Student: ${studentName}
Recent scores:
${scoreText}

Respond in JSON format (no markdown code blocks):
{
  "weaknessSummary": "Weakness analysis summary (within 100 chars, in Traditional Chinese)",
  "recommendedCourseName": "Recommended course name (in Traditional Chinese)",
  "recommendedCourseDesc": "Course description (within 80 chars, in Traditional Chinese)"
}

If there isn't enough data to analyze, provide reasonable general suggestions.`

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  try {
    const jsonStr = text
      .replace(/```json?\n?/g, '')
      .replace(/```/g, '')
      .trim()
    const parsed = JSON.parse(jsonStr) as Partial<AnalysisResult>

    return {
      weaknessSummary: parsed.weaknessSummary ?? 'No analysis available',
      recommendedCourseName: parsed.recommendedCourseName ?? 'Basic reinforcement',
      recommendedCourseDesc: parsed.recommendedCourseDesc ?? 'Recommend strengthening basics',
    }
  } catch {
    return {
      weaknessSummary: 'No analysis available',
      recommendedCourseName: 'Basic reinforcement',
      recommendedCourseDesc: 'Recommend strengthening basics',
    }
  }
}
