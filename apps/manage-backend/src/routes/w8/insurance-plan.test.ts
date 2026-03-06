import { describe, expect, it } from 'vitest'

import {
  calculateSalarySettlementSummary,
  calculateSupplementalHealthPremiumSummary,
  createDefaultInsuranceConfig,
} from './insurance-plan'

describe('calculateSupplementalHealthPremiumSummary', () => {
  it('does not withhold for full-time teachers', () => {
    const config = createDefaultInsuranceConfig('monthly')
    const summary = calculateSupplementalHealthPremiumSummary(config, 50000)

    expect(summary.shouldWithhold).toBe(false)
    expect(summary.amount).toBe(0)
    expect(summary.reason).toContain('正職')
  })

  it('does not withhold when insured through unit', () => {
    const config = createDefaultInsuranceConfig('per_class')
    config.supplementalHealth.insuredThroughUnit = true

    const summary = calculateSupplementalHealthPremiumSummary(config, 50000)

    expect(summary.shouldWithhold).toBe(false)
    expect(summary.amount).toBe(0)
    expect(summary.reason).toContain('本單位投保')
  })

  it('does not withhold when weekly hours suggest normal enrollment review first', () => {
    const config = createDefaultInsuranceConfig('hourly')
    config.supplementalHealth.averageWeeklyHours = 16

    const summary = calculateSupplementalHealthPremiumSummary(config, 50000)

    expect(summary.shouldWithhold).toBe(false)
    expect(summary.amount).toBe(0)
    expect(summary.reason).toContain('12 小時')
  })

  it('withholds when part-time payment reaches threshold', () => {
    const config = createDefaultInsuranceConfig('per_class')
    config.supplementalHealth.averageWeeklyHours = 6

    const summary = calculateSupplementalHealthPremiumSummary(config, 30400)

    expect(summary.shouldWithhold).toBe(true)
    expect(summary.amount).toBe(641)
    expect(summary.rate).toBe(0.0211)
  })
})

describe('calculateSalarySettlementSummary', () => {
  it('keeps supplemental premium out of net amount before review', () => {
    const config = createDefaultInsuranceConfig('per_class')
    config.health.enabled = true
    config.health.calculationMode = 'manual'
    config.health.manualPersonalAmount = 420
    config.health.manualEmployerAmount = 840

    const summary = calculateSalarySettlementSummary(config, 'per_class', 30400, false)

    expect(summary.personalInsuranceTotal).toBe(420)
    expect(summary.supplementalHealthPremiumAmount).toBe(641)
    expect(summary.supplementalHealthDeductedAmount).toBe(0)
    expect(summary.netAmount).toBe(29980)
  })

  it('deducts supplemental premium after reviewer approval', () => {
    const config = createDefaultInsuranceConfig('per_class')
    config.health.enabled = true
    config.health.calculationMode = 'manual'
    config.health.manualPersonalAmount = 420
    config.health.manualEmployerAmount = 840

    const summary = calculateSalarySettlementSummary(config, 'per_class', 30400, true)

    expect(summary.supplementalHealthPremiumAmount).toBe(641)
    expect(summary.supplementalHealthDeductedAmount).toBe(641)
    expect(summary.netAmount).toBe(29339)
  })
})