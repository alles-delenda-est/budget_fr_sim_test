import { describe, it, expect } from 'vitest'
import { calculatePolicyImpact, PRESETS } from '../policy-impact'
import {
  STRUCTURAL_REFORMS,
  projectFiscalPath,
  getBaselineProjection,
  assessDoomLoop,
  validateProjection,
} from '../projection-engine-v1.8'

// =============================================================================
// End-to-end integration tests
// =============================================================================

describe('Knafo preset end-to-end', () => {
  const impact = calculatePolicyImpact(PRESETS.knafo.levers)
  const baseline = getBaselineProjection(10)
  const projection = projectFiscalPath(impact, { years: 10, enableRiskPremium: true })

  it('Knafo net deficit improvement is positive', () => {
    const improvement = impact.revenueChange - impact.spendingChange
    expect(improvement).toBeGreaterThan(10)
  })

  it('Knafo debt trajectory improves vs baseline', () => {
    expect(projection[10].debtRatio).toBeLessThan(baseline[10].debtRatio)
  })

  it('Knafo deficit is lower than baseline at year 1', () => {
    expect(projection[0].deficit).toBeLessThan(baseline[0].deficit)
  })

  it('Knafo interest rate is lower than baseline by year 10', () => {
    expect(projection[10].effectiveInterestRate)
      .toBeLessThanOrEqual(baseline[10].effectiveInterestRate)
  })
})

describe('Maximum austerity', () => {
  const impact = calculatePolicyImpact({
    incomeTaxChange: 10,
    vatChange: 5,
    corpTaxChange: 5,
    socialContributions: 5,
    csgRate: 2,
    spendingEducation: -20,
    spendingDefense: -15,
    spendingSolidarity: -30,
    pensionIndexation: -2,
    healthSpending: -10,
  })
  const baseline = getBaselineProjection(10)
  const projection = projectFiscalPath(impact, { years: 10, enableRiskPremium: true })

  it('deficit improvement is massive', () => {
    const improvement = impact.revenueChange - impact.spendingChange
    expect(improvement).toBeGreaterThan(150)
  })

  it('debt ratio falls over 10 years', () => {
    expect(projection[10].debtRatio).toBeLessThan(projection[0].debtRatio)
  })

  it('debt ratio much lower than baseline', () => {
    expect(projection[10].debtRatio).toBeLessThan(baseline[10].debtRatio - 20)
  })

  it('interest rate drops vs baseline', () => {
    expect(projection[10].effectiveInterestRate)
      .toBeLessThan(baseline[10].effectiveInterestRate)
  })

  it('doom loop severity is low', () => {
    const doom = assessDoomLoop(projection)
    expect(doom.severity).toBe('low')
  })

  it('validation passes', () => {
    const result = validateProjection(projection)
    expect(result.valid).toBe(true)
  })
})

describe('Maximum stimulus', () => {
  const impact = calculatePolicyImpact({
    incomeTaxChange: -10,
    vatChange: -5,
    corpTaxChange: -10,
    socialContributions: -5,
    csgRate: -2,
    spendingEducation: 20,
    spendingDefense: 15,
    spendingSolidarity: 30,
    pensionIndexation: 1,
    healthSpending: 10,
  })
  const baseline = getBaselineProjection(20)
  const projection = projectFiscalPath(impact, { years: 20, enableRiskPremium: true })

  it('deficit worsening is massive', () => {
    const worsening = impact.revenueChange - impact.spendingChange
    expect(worsening).toBeLessThan(-150)
  })

  it('debt ratio explodes over 20 years', () => {
    expect(projection[20].debtRatio).toBeGreaterThan(200)
  })

  it('debt ratio much higher than baseline', () => {
    expect(projection[20].debtRatio).toBeGreaterThan(baseline[20].debtRatio + 50)
  })

  it('validation reports warnings', () => {
    const result = validateProjection(projection)
    expect(result.valid).toBe(false)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('doom loop severity is high', () => {
    const doom = assessDoomLoop(projection)
    expect(doom.severity).toBe('high')
    expect(doom.doomLoopActive).toBe(true)
  })
})

describe('Structural reforms alone', () => {
  const baseline = getBaselineProjection(10)
  const withReform = projectFiscalPath({}, {
    years: 10,
    enableRiskPremium: true,
    structuralReform: STRUCTURAL_REFORMS.ambitious,
  })

  it('debt/GDP improves vs baseline by year 10', () => {
    expect(withReform[10].debtRatio).toBeLessThan(baseline[10].debtRatio)
  })

  it('growth rate higher by year 5', () => {
    expect(withReform[5].nominalGrowthRate).toBeGreaterThan(baseline[5].nominalGrowthRate)
  })

  it('GDP is higher by year 10', () => {
    expect(withReform[10].gdp).toBeGreaterThan(baseline[10].gdp)
  })

  it('deficit is lower by year 5 (growth feedback)', () => {
    expect(withReform[5].deficit).toBeLessThan(baseline[5].deficit)
  })

  it('interest rate is lower by year 10 (lower debt ratio)', () => {
    expect(withReform[10].effectiveInterestRate)
      .toBeLessThan(baseline[10].effectiveInterestRate)
  })
})

describe('Political risk stress test', () => {
  const proj0 = projectFiscalPath({}, { years: 10, politicalRiskPremium: 0 })
  const proj100 = projectFiscalPath({}, { years: 10, politicalRiskPremium: 0.01 }) // 100 bps
  const proj200 = projectFiscalPath({}, { years: 10, politicalRiskPremium: 0.02 }) // 200 bps

  it('0 bps < 100 bps < 200 bps for interest rate at year 0', () => {
    expect(proj0[0].effectiveInterestRate).toBeLessThan(proj100[0].effectiveInterestRate)
    expect(proj100[0].effectiveInterestRate).toBeLessThan(proj200[0].effectiveInterestRate)
  })

  it('progressively worse debt ratios at year 10', () => {
    expect(proj0[10].debtRatio).toBeLessThan(proj100[10].debtRatio)
    expect(proj100[10].debtRatio).toBeLessThan(proj200[10].debtRatio)
  })

  it('progressively worse deficits at year 0', () => {
    expect(proj0[0].deficit).toBeLessThan(proj100[0].deficit)
    expect(proj100[0].deficit).toBeLessThan(proj200[0].deficit)
  })

  it('200 bps premium adds ~66 Md€ interest at year 0', () => {
    // 3300 * 0.02 = 66
    const interestDiff = proj200[0].interest - proj0[0].interest
    expect(interestDiff).toBeCloseTo(66, 0)
  })

  it('doom loop severity worsens with higher risk', () => {
    const doom0 = assessDoomLoop(proj0)
    const doom200 = assessDoomLoop(proj200)
    // Both should have active doom loop (baseline already triggers it)
    // 200 bps should be at least as severe
    expect(doom200.premiumIncreaseBps).toBeGreaterThanOrEqual(doom0.premiumIncreaseBps)
  })
})
