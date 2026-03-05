/**
 * 台灣學制年級自動計算
 * 以 9/1 為學年分界，根據出生日期算出當前年級
 */

const GRADE_LABELS: Record<number, string> = {
  3: '幼兒園小班', 4: '幼兒園中班', 5: '幼兒園大班',
  6: '小一', 7: '小二', 8: '小三', 9: '小四', 10: '小五', 11: '小六',
  12: '國一', 13: '國二', 14: '國三',
  15: '高一', 16: '高二', 17: '高三',
}

export function computeGrade(dateOfBirth: string | Date, referenceDate?: Date): string | null {
  const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
  if (isNaN(dob.getTime())) return null

  const ref = referenceDate ?? new Date()
  // 台灣學制：以 9/1 為學年起始
  // 計算「學年度年齡」：若當前日期 >= 9/1，用今年 9/1 算；否則用去年 9/1 算
  const academicYear = ref.getMonth() >= 8 ? ref.getFullYear() : ref.getFullYear() - 1
  const academicStart = new Date(academicYear, 8, 1) // 9/1

  let age = academicStart.getFullYear() - dob.getFullYear()
  const monthDiff = academicStart.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && academicStart.getDate() < dob.getDate())) {
    age--
  }

  if (age < 3) return '未就學'
  if (age > 17) return '已畢業'
  return GRADE_LABELS[age] ?? null
}

export function computeGradeLevel(dateOfBirth: string | Date, referenceDate?: Date): string | null {
  return computeGrade(dateOfBirth, referenceDate)
}
