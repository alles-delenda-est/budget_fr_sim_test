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
//
// NOTE: These tests reflect behaviour under the ETI-calibrated model (v2.0).
// Key properties:
//  - Tax increases have a revenue haircut (increaseEfficiency < 1) AND a
//    growth drag (growthDragPerPp × pp increase).
//  - Spending changes have fiscal-multiplier growth effects (both directions).
//  - Debt-stock inertia means interest convergence is slow (~8 yr full pass-through).
//  - Fiscal multipliers mean spending cuts reduce growth, which can offset or
//    even outweigh the primary-deficit improvement in debt/GDP dynamics.
// =============================================================================

describe('Knafo preset end-to-end', () => {
  const impact = calculatePolicyImpact(PRESETS.knafo.levers)
  const baseline = getBaselineProjection(10)
  const projection = projectFiscalPath(impact, { years: 10, enableRiskPremium: true })

  it('Knafo net deficit improvement is positive', () => {
    const improvement = impact.revenueChange - impact.spendingChange
    expect(improvement).toBeGreaterThan(10)
  })

  it('Knafo deficit is lower than baseline at year 1', () => {
    expect(projection[0].deficit).toBeLessThan(baseline[0].deficit)
  })

  it('Knafo growth is below baseline (spending cuts reduce GDP via multipliers)', () => {
    // All Knafo spending levers are cuts → multiplier effect is negative
    expect(projection[0].nominalGrowthRate).toBeLessThan(baseline[0].nominalGrowthRate)
  })

  it('Knafo produces correct shape of output', () => {
    expect(projection).toHaveLength(11)
    projection.forEach(entry => {
      expect(typeof entry.debtRatio).toBe('number')
      expect(typeof entry.unemploymentRate).toBe('number')
    })
  })
})

describe('Maximum austerity (all taxes up, all spending down)', () => {
  // Under ETI-calibrated model:
  //   - Revenue from tax increases is haircutted by increaseEfficiency
  //   - Each pp increase creates growthDrag (negative growthEffect)
  //   - Spending cuts also create negative multiplier growth effects
  //   - The combined growth damage can dominate the fiscal improvement,
  //     causing debt/GDP to WORSEN despite primary surplus
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

  it('deficit improvement (static) is massive', () => {
    const improvement = impact.revenueChange - impact.spendingChange
    expect(improvement).toBeGreaterThan(150)
  })

  it('validation passes (no extreme projections within 10 years)', () => {
    const result = validateProjection(projection)
    expect(result.valid).toBe(true)
  })

  it('growth is severely negative due to ETI tax drag + multiplier spending cuts', () => {
    // Tax increases + spending cuts both reduce growth in the new model
    expect(impact.growthEffect).toBeLessThan(-0.03)
  })

  it('Okun: unemployment rises when growth crashes', () => {
    // Massive negative growth → large unemployment increase
    expect(projection[0].unemploymentRate).toBeGreaterThan(baseline[0].unemploymentRate)
  })
})

describe('Maximum stimulus (all taxes down, all spending up)', () => {
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
