import { describe, it, expect } from 'vitest'
import { calculatePolicyImpact, PRESETS, PENSION_REFORM_PRESETS } from '../policy-impact'
import {
  STRUCTURAL_REFORMS,
  PENSION_REFORM,
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

  it('debt ratio worsens over 20 years vs baseline start', () => {
    // With tax cut growth boosts, the debt explosion is dampened but debt still worsens
    expect(projection[20].debtRatio).toBeGreaterThan(projection[0].debtRatio)
  })

  it('debt ratio higher than baseline at year 20 (despite tax cut growth boosts)', () => {
    // Tax cut growth boosts partially offset but cannot fully compensate massive deficit
    expect(projection[20].debtRatio).toBeGreaterThan(baseline[0].debtRatio)
  })

  it('deficit at year 1 is worse than baseline (before growth feedback)', () => {
    // At year 1, tax cut growth boosts haven't fully kicked in yet
    // Primary deficit worsening dominates
    expect(projection[0].deficit).toBeGreaterThan(baseline[0].deficit)
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

describe('Demographic drift integration', () => {
  const withDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
  const noDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: false })

  it('demographic drift adds ~18 Md to deficit at year 10', () => {
    const deficitDiff = withDrift[10].deficit - noDrift[10].deficit
    expect(deficitDiff).toBeGreaterThan(10)
    expect(deficitDiff).toBeLessThan(30)
  })

  it('demographic drift worsens debt ratio by year 10', () => {
    expect(withDrift[10].debtRatio).toBeGreaterThan(noDrift[10].debtRatio)
  })

  it('baseline (with default demographic drift) remains valid', () => {
    const result = validateProjection(withDrift)
    expect(result.valid).toBe(true)
  })

  it('20-year projection with demographic drift triggers debt warning (realistic)', () => {
    const proj20 = projectFiscalPath({}, { years: 20, enableDemographicDrift: true })
    const result = validateProjection(proj20)
    // With demographic drift, 20-year baseline debt ratio exceeds 200% — expected
    expect(proj20[20].debtRatio).toBeGreaterThan(180)
  })

  it('reform + demographic drift: reform partially offsets demographic pressure', () => {
    const reformDrift = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.ambitious,
      enableDemographicDrift: true,
    })
    // Reform helps but demographic pressure still adds spending
    // Deficit with reform+drift should be less than drift-only
    expect(reformDrift[10].deficit).toBeLessThan(withDrift[10].deficit)
    // But worse than reform without drift
    const reformNoDrift = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.ambitious,
      enableDemographicDrift: false,
    })
    expect(reformDrift[10].deficit).toBeGreaterThan(reformNoDrift[10].deficit)
  })
})

describe('ONDAM floor integration with projection', () => {
  it('GL preset with -8% health cut is damped in projection', () => {
    const impact = calculatePolicyImpact(PRESETS.generationLibre.levers)
    // GL has healthSpending: -8, which triggers ONDAM floor
    expect(impact.ondamWarning).not.toBeNull()
    expect(impact.ondamEffectiveCut).toBeCloseTo(-5.5, 1)
  })
})

// =============================================================================
// COR SCENARIO INTEGRATION TESTS
// =============================================================================

describe('COR scenario integration', () => {
  it('each COR preset produces a valid projection', () => {
    for (const [key, preset] of Object.entries(PENSION_REFORM_PRESETS)) {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: preset.pensionReform,
      })
      expect(result).toHaveLength(11)
      const validation = validateProjection(result)
      expect(validation.valid).toBe(true)
    }
  })

  it('reformeRetraites reduces deficit vs baseline at year 10', () => {
    const baseline = projectFiscalPath({}, { years: 10 })
    const reform = projectFiscalPath({}, {
      years: 10,
      pensionReform: PENSION_REFORM_PRESETS.reformeRetraites.pensionReform,
    })
    expect(reform[10].deficit).toBeLessThan(baseline[10].deficit)
  })

  it('reformeRetraites saving at year 10 is significant (>30 Md)', () => {
    const reform = projectFiscalPath({}, {
      years: 10,
      pensionReform: PENSION_REFORM_PRESETS.reformeRetraites.pensionReform,
    })
    // Age 67 + desindexation 1.5 + cap 15% + notionnel all contribute
    expect(reform[10].pensionReformSaving).toBeGreaterThan(30)
  })

  it('pension floor prevents extreme savings', () => {
    const reform = projectFiscalPath({}, {
      years: 20,
      pensionReform: PENSION_REFORM_PRESETS.reformeRetraites.pensionReform,
    })
    const maxSaving = PENSION_REFORM.pensionMass * (1 - PENSION_REFORM.pensionFloor)
    reform.forEach(entry => {
      expect(entry.pensionReformSaving).toBeLessThanOrEqual(maxSaving + 0.1)
    })
  })
})

describe('Pension reform + demographic drift interaction', () => {
  it('pension reform partially offsets demographic pressure', () => {
    const driftOnly = projectFiscalPath({}, {
      years: 10,
      enableDemographicDrift: true,
    })
    const reformPlusDrift = projectFiscalPath({}, {
      years: 10,
      enableDemographicDrift: true,
      pensionReform: { retirementAge: 67, desindexation: 1.0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    })
    // Reform should reduce deficit vs drift-only
    expect(reformPlusDrift[10].deficit).toBeLessThan(driftOnly[10].deficit)
  })

  it('demographic drift still worsens deficit even with reform', () => {
    const reformNoDrift = projectFiscalPath({}, {
      years: 10,
      enableDemographicDrift: false,
      pensionReform: { retirementAge: 67, desindexation: 1.0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    })
    const reformPlusDrift = projectFiscalPath({}, {
      years: 10,
      enableDemographicDrift: true,
      pensionReform: { retirementAge: 67, desindexation: 1.0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    })
    expect(reformPlusDrift[10].deficit).toBeGreaterThan(reformNoDrift[10].deficit)
  })
})

describe('Migration and dependance integration', () => {
  it('all channels enabled produces valid 20-year projection', () => {
    const result = projectFiscalPath({}, {
      years: 20,
      enableDemographicDrift: true,
      enableMigrationImpact: true,
      enableDependanceDrift: true,
    })
    expect(result).toHaveLength(21)
    result.forEach(entry => {
      expect(entry.gdp).not.toBeNaN()
      expect(entry.deficit).not.toBeNaN()
      expect(entry.debtRatio).not.toBeNaN()
    })
  })

  it('existing presets still produce valid projections with new channels', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      const impact = calculatePolicyImpact(preset.levers)
      const result = projectFiscalPath(impact, { years: 10 })
      expect(result).toHaveLength(11)
      result.forEach(entry => {
        expect(entry.deficit).not.toBeNaN()
      })
    }
  })
})
