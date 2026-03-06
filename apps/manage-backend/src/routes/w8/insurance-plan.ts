type InsuranceCalculationMode = 'auto' | 'manual'
type EmploymentType = 'full_time' | 'part_time'

interface InsurancePlanConfig {
  enabled: boolean
  tierLevel: number | null
  calculationMode: InsuranceCalculationMode
  manualPersonalAmount: number | null
  manualEmployerAmount: number | null
}

interface SupplementalHealthConfig {
  employmentType: EmploymentType
  insuredThroughUnit: boolean
  averageWeeklyHours: number | null
  notes: string | null
}

export interface TeacherInsuranceConfig {
  labor: InsurancePlanConfig
  health: InsurancePlanConfig
  supplementalHealth: SupplementalHealthConfig
}

export interface InsuranceContributionSummary {
  config: TeacherInsuranceConfig
  laborPersonalAmount: number
  laborEmployerAmount: number
  healthPersonalAmount: number
  healthEmployerAmount: number
  personalTotal: number
  employerTotal: number
}

export interface SupplementalHealthPremiumSummary {
  shouldWithhold: boolean
  amount: number
  threshold: number
  rate: number
  reason: string
}

export interface SalarySettlementSummary {
  grossAmount: number
  personalInsuranceTotal: number
  supplementalHealthPremiumAmount: number
  supplementalHealthDeductedAmount: number
  netAmount: number
  insurance: InsuranceContributionSummary
  supplementalHealth: SupplementalHealthPremiumSummary
}

const LABOR_TIER_WAGES = new Map<number, number>([
  [1, 27470],
  [2, 28800],
  [3, 30300],
  [4, 31800],
  [5, 33300],
  [6, 34800],
  [7, 36300],
  [8, 38200],
  [9, 40100],
  [10, 42000],
  [11, 44000],
  [12, 45800],
])

const HEALTH_TIER_WAGES = new Map<number, number>([
  [1, 27470],
  [2, 28800],
  [3, 30300],
  [4, 31800],
  [5, 33300],
  [6, 34800],
  [7, 36300],
  [8, 38200],
  [9, 40100],
  [10, 42000],
  [11, 44000],
  [12, 45800],
])

const DEFAULT_TIER_LEVEL = 1
const SECOND_GEN_HEALTH_PREMIUM_RATE = 0.0211
const PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD = 29500

const calcLabor = (wage: number) => ({
  personal: Math.round(wage * 0.12 * 0.20),
  employer: Math.round(wage * 0.12 * 0.70),
})

const calcHealth = (wage: number) => ({
  personal: Math.round(wage * 0.0517 * 0.30),
  employer: Math.round(wage * 0.0517 * 0.60),
})

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const toNonNegativeNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return null
}

const toTierLevel = (value: unknown, wages: Map<number, number>): number | null => {
  if (value === null) {
    return null
  }
  const parsed = toNonNegativeNumber(value)
  if (parsed === null) {
    return DEFAULT_TIER_LEVEL
  }

  const level = Math.trunc(parsed)
  return wages.has(level) ? level : DEFAULT_TIER_LEVEL
}

const createDefaultPlan = (enabled: boolean): InsurancePlanConfig => ({
  enabled,
  tierLevel: DEFAULT_TIER_LEVEL,
  calculationMode: 'auto',
  manualPersonalAmount: null,
  manualEmployerAmount: null,
})

export const createDefaultInsuranceConfig = (salaryType?: string): TeacherInsuranceConfig => {
  const isMonthly = salaryType === 'monthly'
  return {
    labor: createDefaultPlan(isMonthly),
    health: createDefaultPlan(isMonthly),
    supplementalHealth: {
      employmentType: isMonthly ? 'full_time' : 'part_time',
      insuredThroughUnit: isMonthly,
      averageWeeklyHours: null,
      notes: null,
    },
  }
}

const normalizePlan = (
  rawPlan: unknown,
  defaultPlan: InsurancePlanConfig,
  wages: Map<number, number>
): InsurancePlanConfig => {
  if (!isRecord(rawPlan)) {
    return defaultPlan
  }

  return {
    enabled: typeof rawPlan.enabled === 'boolean' ? rawPlan.enabled : defaultPlan.enabled,
    tierLevel: toTierLevel(rawPlan.tierLevel, wages),
    calculationMode: rawPlan.calculationMode === 'manual' ? 'manual' : 'auto',
    manualPersonalAmount: toNonNegativeNumber(rawPlan.manualPersonalAmount),
    manualEmployerAmount: toNonNegativeNumber(rawPlan.manualEmployerAmount),
  }
}

export const normalizeTeacherInsuranceConfig = (raw: unknown, salaryType?: string): TeacherInsuranceConfig => {
  const defaults = createDefaultInsuranceConfig(salaryType)

  if (!isRecord(raw)) {
    return defaults
  }

  const supplementalRaw = isRecord(raw.supplementalHealth) ? raw.supplementalHealth : null

  return {
    labor: normalizePlan(raw.labor, defaults.labor, LABOR_TIER_WAGES),
    health: normalizePlan(raw.health, defaults.health, HEALTH_TIER_WAGES),
    supplementalHealth: {
      employmentType: supplementalRaw?.employmentType === 'full_time' ? 'full_time' : 'part_time',
      insuredThroughUnit: typeof supplementalRaw?.insuredThroughUnit === 'boolean'
        ? supplementalRaw.insuredThroughUnit
        : defaults.supplementalHealth.insuredThroughUnit,
      averageWeeklyHours: toNonNegativeNumber(supplementalRaw?.averageWeeklyHours),
      notes: typeof supplementalRaw?.notes === 'string' && supplementalRaw.notes.trim() !== ''
        ? supplementalRaw.notes.trim()
        : null,
    },
  }
}

const calculatePlanContribution = (
  plan: InsurancePlanConfig,
  wages: Map<number, number>,
  calcFn: (wage: number) => { personal: number; employer: number }
) => {
  if (!plan.enabled) {
    return { personal: 0, employer: 0 }
  }

  if (plan.calculationMode === 'manual') {
    return {
      personal: Math.round(plan.manualPersonalAmount ?? 0),
      employer: Math.round(plan.manualEmployerAmount ?? 0),
    }
  }

  const wage = wages.get(plan.tierLevel ?? DEFAULT_TIER_LEVEL) ?? wages.get(DEFAULT_TIER_LEVEL) ?? 0
  return calcFn(wage)
}

export const calculateTeacherInsuranceSummary = (raw: unknown, salaryType?: string): InsuranceContributionSummary => {
  const config = normalizeTeacherInsuranceConfig(raw, salaryType)
  const labor = calculatePlanContribution(config.labor, LABOR_TIER_WAGES, calcLabor)
  const health = calculatePlanContribution(config.health, HEALTH_TIER_WAGES, calcHealth)

  return {
    config,
    laborPersonalAmount: labor.personal,
    laborEmployerAmount: labor.employer,
    healthPersonalAmount: health.personal,
    healthEmployerAmount: health.employer,
    personalTotal: labor.personal + health.personal,
    employerTotal: labor.employer + health.employer,
  }
}

export const calculateSupplementalHealthPremiumSummary = (
  raw: unknown,
  grossAmount: number
): SupplementalHealthPremiumSummary => {
  const config = normalizeTeacherInsuranceConfig(raw)
  const supplemental = config.supplementalHealth
  const weeklyHours = supplemental.averageWeeklyHours ?? 0

  if (supplemental.employmentType === 'full_time') {
    return {
      shouldWithhold: false,
      amount: 0,
      threshold: PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD,
      rate: SECOND_GEN_HEALTH_PREMIUM_RATE,
      reason: '正職人員通常走一般健保投保，不列兼職補充保費試算。',
    }
  }

  if (supplemental.insuredThroughUnit) {
    return {
      shouldWithhold: false,
      amount: 0,
      threshold: PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD,
      rate: SECOND_GEN_HEALTH_PREMIUM_RATE,
      reason: '已由本單位投保健保，不列非所屬投保單位兼職薪資補充保費。',
    }
  }

  if (weeklyHours >= 12) {
    return {
      shouldWithhold: false,
      amount: 0,
      threshold: PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD,
      rate: SECOND_GEN_HEALTH_PREMIUM_RATE,
      reason: '平均每週工時達 12 小時以上，應先確認是否改由本單位辦理一般健保投保。',
    }
  }

  if (grossAmount < PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD) {
    return {
      shouldWithhold: false,
      amount: 0,
      threshold: PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD,
      rate: SECOND_GEN_HEALTH_PREMIUM_RATE,
      reason: '本次給付未達兼職薪資補充保費基本工資門檻。',
    }
  }

  return {
    shouldWithhold: true,
    amount: Math.round(grossAmount * SECOND_GEN_HEALTH_PREMIUM_RATE),
    threshold: PART_TIME_SUPPLEMENTAL_PREMIUM_THRESHOLD,
    rate: SECOND_GEN_HEALTH_PREMIUM_RATE,
    reason: '兼職且未在本單位投保，單次給付達基本工資門檻，建議代扣二代健保補充保費。',
  }
}

export const calculateSalarySettlementSummary = (
  raw: unknown,
  salaryType: string | undefined,
  grossAmount: number,
  withholdSupplementalHealth: boolean
): SalarySettlementSummary => {
  const insurance = calculateTeacherInsuranceSummary(raw, salaryType)
  const supplementalHealth = calculateSupplementalHealthPremiumSummary(raw, grossAmount)
  const supplementalHealthDeductedAmount = withholdSupplementalHealth && supplementalHealth.shouldWithhold
    ? supplementalHealth.amount
    : 0

  return {
    grossAmount,
    personalInsuranceTotal: insurance.personalTotal,
    supplementalHealthPremiumAmount: supplementalHealth.amount,
    supplementalHealthDeductedAmount,
    netAmount: grossAmount - insurance.personalTotal - supplementalHealthDeductedAmount,
    insurance,
    supplementalHealth,
  }
}