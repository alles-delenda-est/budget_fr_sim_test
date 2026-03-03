import { describe, it, expect } from 'vitest'
import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  SOCIAL_HOUSING_LIQUIDATION,
  ROLLOVER_RATE,
  DEFICIT_STRESS_THRESHOLD,
  DEFICIT_STRESS_SENSITIVITY,
  DEMOGRAPHIC_PARAMS,
  DEMOGRAPHIC_PRESSURE_PER_YEAR,
  SENIOR_EMPLOYMENT,
  PENSION_REFORM,
  MIGRATION_PARAMS,
  MIGRATION_NET_WORKERS_PER_YEAR,
  DEPENDANCE_PARAMS,
  calculateInterestRate,
  calculateReformGrowthBoost,
  projectFiscalPath,
  getBaselineProjection,
  assessDoomLoop,
  validateProjection,
} from '../projection-engine-v1.8'

// =============================================================================
// MACRO_BASELINE constants - regression guards
// =============================================================================

describe('MACRO_BASELINE constants', () => {
  it('has correct GDP', () => {
    expect(MACRO_BASELINE.gdp).toBe(2850)
  })

  it('has correct debt', () => {
    expect(MACRO_BASELINE.debt).toBe(3300)
  })

  it('has correct debt-to-GDP', () => {
    expect(MACRO_BASELINE.debtToGdp).toBe(115.8)
  })

  it('debt-to-GDP matches debt/gdp ratio', () => {
    const computed = (MACRO_BASELINE.debt / MACRO_BASELINE.gdp) * 100
    expect(computed).toBeCloseTo(MACRO_BASELINE.debtToGdp, 0)
  })

  it('has correct base interest rate', () => {
    expect(MACRO_BASELINE.baseInterestRate).toBe(-0.0004)
  })

  it('has correct political premium (21 bps)', () => {
    expect(MACRO_BASELINE.riskPremium.politicalPremium).toBe(0.0021)
  })

  it('has correct nominal growth', () => {
    expect(MACRO_BASELINE.nominalGrowth).toBe(0.025)
  })

  it('has correct primary deficit', () => {
    expect(MACRO_BASELINE.primaryDeficit).toBe(87.2)
  })

  it('has correct tax elasticity', () => {
    expect(MACRO_BASELINE.taxElasticity).toBe(0.45)
  })

  it('has risk premium thresholds at 60/90/120', () => {
    expect(MACRO_BASELINE.riskPremium.threshold1).toBe(60)
    expect(MACRO_BASELINE.riskPremium.threshold2).toBe(90)
    expect(MACRO_BASELINE.riskPremium.threshold3).toBe(120)
  })

  it('has unemployment rate 7.3%', () => {
    expect(MACRO_BASELINE.unemploymentRate).toBe(7.3)
  })

  it('has Okun coefficient 0.5', () => {
    expect(MACRO_BASELINE.okunCoefficient).toBe(0.5)
  })
})

// =============================================================================
// Inertia and deficit stress constants
// =============================================================================

describe('inertia and deficit stress constants', () => {
  it('ROLLOVER_RATE is 12.5%', () => {
    expect(ROLLOVER_RATE).toBe(0.125)
  })

  it('DEFICIT_STRESS_THRESHOLD is 4.0% GDP', () => {
    expect(DEFICIT_STRESS_THRESHOLD).toBe(4.0)
  })

  it('DEFICIT_STRESS_SENSITIVITY is 17 bps per %', () => {
    expect(DEFICIT_STRESS_SENSITIVITY).toBeCloseTo(0.0017, 6)
  })
})

// =============================================================================
// calculateInterestRate
// =============================================================================

describe('calculateInterestRate', () => {
  describe('normal operation at key debt/GDP points (deficitRatio=0)', () => {
    it('returns base rate at 0% debt/GDP', () => {
      expect(calculateInterestRate(0, 0)).toBeCloseTo(0.0017, 6)
    })

    it('returns base rate at 60% (threshold1 boundary)', () => {
      expect(calculateInterestRate(60, 0)).toBeCloseTo(0.0017, 6)
    })

    it('applies regime 1 slope at 75%', () => {
      // excess = 15, premium = 15 * 0.0003 = 0.0045
      expect(calculateInterestRate(75, 0)).toBeCloseTo(0.0062, 6)
    })

    it('applies full regime 1 at 90% (threshold2 boundary)', () => {
      // premium = 30 * 0.0003 = 0.009
      expect(calculateInterestRate(90, 0)).toBeCloseTo(0.0107, 6)
    })

    it('applies regime 2 slope at 100%', () => {
      // regime1 = 0.009, excess = 10, regime2 = 10 * 0.0004 = 0.004
      expect(calculateInterestRate(100, 0)).toBeCloseTo(0.0147, 6)
    })

    it('produces ~2.1% effective rate at France current 115.8% (no deficit premium)', () => {
      // regime1 = 0.009, excess = 25.8, regime2 = 25.8 * 0.0004 = 0.01032
      const rate = calculateInterestRate(115.8, 0)
      expect(rate).toBeCloseTo(0.02102, 4)
    })

    it('applies full regime 2 at 120% (threshold3 boundary)', () => {
      // regime1 = 0.009, regime2 = 30 * 0.0004 = 0.012
      expect(calculateInterestRate(120, 0)).toBeCloseTo(0.0227, 6)
    })

    it('applies regime 3 crisis slope at 130%', () => {
      // regime1 = 0.009, regime2 = 0.012, excess = 10, regime3 = 10 * 0.001 = 0.01
      expect(calculateInterestRate(130, 0)).toBeCloseTo(0.0327, 6)
    })

    it('applies regime 3 at 150%', () => {
      // regime1 = 0.009, regime2 = 0.012, excess = 30, regime3 = 30 * 0.001 = 0.03
      expect(calculateInterestRate(150, 0)).toBeCloseTo(0.0527, 6)
    })

    it('produces very high rates at 200%', () => {
      // regime1 = 0.009, regime2 = 0.012, excess = 80, regime3 = 80 * 0.001 = 0.08
      expect(calculateInterestRate(200, 0)).toBeCloseTo(0.1027, 6)
    })
  })

  describe('deficit stress premium', () => {
    it('no premium when deficit below threshold (3% GDP)', () => {
      const withoutStress = calculateInterestRate(115.8, 0)
      const belowThreshold = calculateInterestRate(115.8, 3)
      expect(belowThreshold).toBeCloseTo(withoutStress, 6)
    })

    it('adds ~20 bps at France 5.17% deficit/GDP', () => {
      const noDeficit = calculateInterestRate(115.8, 0)
      const withDeficit = calculateInterestRate(115.8, 5.17)
      // (5.17 - 4.0) * 0.0017 = 1.17 * 0.0017 = 0.001989 ≈ 20 bps
      expect((withDeficit - noDeficit) * 10000).toBeCloseTo(19.9, 0)
    })

    it('increases linearly above threshold', () => {
      const at5 = calculateInterestRate(115.8, 5)
      const at6 = calculateInterestRate(115.8, 6)
      // 1% more deficit = 17 bps more
      expect((at6 - at5) * 10000).toBeCloseTo(17, 0)
    })
  })

  describe('options', () => {
    it('returns only base rate when premium disabled', () => {
      const rate = calculateInterestRate(150, 0, { enablePremium: false })
      expect(rate).toBeCloseTo(0.0017, 6)
    })

    it('accepts custom base rate (political premium still added)', () => {
      const rate = calculateInterestRate(0, 0, { baseRate: 0.03 })
      // 0.03 + 0 (no debt premium at 0%) + 0.0021 (political premium) = 0.0321
      expect(rate).toBeCloseTo(0.0321, 6)
    })

    it('adds political risk on top of premium', () => {
      const withoutRisk = calculateInterestRate(115.8, 0)
      const withRisk = calculateInterestRate(115.8, 0, { politicalRisk: 0.02 })
      expect(withRisk - withoutRisk).toBeCloseTo(0.02, 6)
    })

    it('political risk works when premium disabled', () => {
      const rate = calculateInterestRate(200, 0, {
        enablePremium: false,
        politicalRisk: 0.01,
      })
      expect(rate).toBeCloseTo(0.0017 + 0.01, 6)
    })
  })

  describe('backward compatibility: deficitRatio defaults to 0', () => {
    it('single-argument call still works (no deficit premium)', () => {
      const rate = calculateInterestRate(115.8)
      expect(rate).toBeCloseTo(0.02102, 4)
    })
  })

  describe('monotonicity', () => {
    it('rate never decreases as debt increases (sweep 0-300%, deficitRatio=0)', () => {
      let prev = calculateInterestRate(0, 0)
      for (let ratio = 1; ratio <= 300; ratio++) {
        const current = calculateInterestRate(ratio, 0)
        expect(current).toBeGreaterThanOrEqual(prev)
        prev = current
      }
    })
  })

  describe('edge cases (documenting behavior)', () => {
    it('negative debt ratio produces rate below base rate', () => {
      // debtRatio <= threshold1, so premium = 0
      const rate = calculateInterestRate(-50, 0)
      expect(rate).toBeCloseTo(0.0017, 6)
    })

    it('NaN input propagates to NaN output', () => {
      expect(calculateInterestRate(NaN, 0)).toBeNaN()
    })

    it('undefined input propagates to NaN output', () => {
      expect(calculateInterestRate(undefined, 0)).toBeNaN()
    })
  })
})

// =============================================================================
// calculateReformGrowthBoost
// =============================================================================

describe('calculateReformGrowthBoost', () => {
  const hartzIV = STRUCTURAL_REFORMS.hartzIV
  // growthEffect: 0.0035, lag: 2, duration: 8

  describe('phase lifecycle (hartzIV)', () => {
    it('returns 0 at year 0', () => {
      expect(calculateReformGrowthBoost(0, hartzIV)).toBe(0)
    })

    it('linear phase-in at year 1 (50% of effect)', () => {
      expect(calculateReformGrowthBoost(1, hartzIV)).toBeCloseTo(0.0035 * 0.5, 6)
    })

    it('reaches full effect at lag year', () => {
      expect(calculateReformGrowthBoost(2, hartzIV)).toBeCloseTo(0.0035, 6)
    })

    it('maintains full effect during peak period', () => {
      expect(calculateReformGrowthBoost(5, hartzIV)).toBeCloseTo(0.0035, 6)
      expect(calculateReformGrowthBoost(9, hartzIV)).toBeCloseTo(0.0035, 6)
    })

    it('begins decay at lag+duration', () => {
      // year 10 = lag(2) + duration(8), yearsSincePeak = 0
      expect(calculateReformGrowthBoost(10, hartzIV)).toBeCloseTo(0.0035, 6)
    })

    it('decays exponentially after peak', () => {
      // year 11: 0.0035 * 0.93^1
      expect(calculateReformGrowthBoost(11, hartzIV)).toBeCloseTo(0.0035 * 0.93, 6)
      // year 13: 0.0035 * 0.93^3
      expect(calculateReformGrowthBoost(13, hartzIV)).toBeCloseTo(
        0.0035 * Math.pow(0.93, 3), 6
      )
    })
  })

  describe('education reform (long lag, long duration)', () => {
    const education = STRUCTURAL_REFORMS.education
    // growthEffect: 0.0008, lag: 5, duration: 20

    it('phase-in at year 3 is 60% of effect', () => {
      expect(calculateReformGrowthBoost(3, education)).toBeCloseTo(0.0008 * 3 / 5, 6)
    })

    it('full effect at year 5', () => {
      expect(calculateReformGrowthBoost(5, education)).toBeCloseTo(0.0008, 6)
    })

    it('still at full effect at year 24', () => {
      expect(calculateReformGrowthBoost(24, education)).toBeCloseTo(0.0008, 6)
    })

    it('begins fade at year 25', () => {
      expect(calculateReformGrowthBoost(25, education)).toBeCloseTo(0.0008, 6) // 0.93^0
    })
  })

  describe('ambitious package', () => {
    const ambitious = STRUCTURAL_REFORMS.ambitious
    // growthEffect: 0.004, lag: 2, duration: 12

    it('full effect is 0.4 pp/year', () => {
      expect(calculateReformGrowthBoost(5, ambitious)).toBeCloseTo(0.004, 6)
    })
  })

  describe('edge cases (documenting behavior)', () => {
    it('negative year produces negative boost via phase-in formula', () => {
      // year = -1, boost = 0.0035 * (-1/2) = -0.00175
      const boost = calculateReformGrowthBoost(-1, hartzIV)
      expect(boost).toBeCloseTo(-0.00175, 6)
    })
  })
})

// =============================================================================
// projectFiscalPath
// =============================================================================

describe('projectFiscalPath', () => {
  describe('baseline (zero policy change)', () => {
    const baseline = projectFiscalPath({}, { years: 10 })

    it('returns years+1 entries', () => {
      expect(baseline).toHaveLength(11)
    })

    it('year 0 has correct GDP', () => {
      expect(baseline[0].gdp).toBe(2850)
    })

    it('year 0 has correct debt', () => {
      expect(baseline[0].debt).toBe(3300)
    })

    it('year 0 has correct debt ratio', () => {
      expect(baseline[0].debtRatio).toBe(115.8)
    })

    it('year 0 effective rate reflects portfolio rate ~2.1%', () => {
      // Portfolio rate starts at calculateInterestRate(115.8, 0) = 2.1%
      // interest is computed before rollover, effectiveInterestRate shows portfolio rate
      expect(baseline[0].effectiveInterestRate).toBeCloseTo(2.1, 0)
    })

    it('year 0 interest ~69 Md (uses start-of-year portfolio rate)', () => {
      // Initial avgPortfolioRate ≈ 2.1%, interest = 3300 * 0.021 = 69.3
      expect(baseline[0].interest).toBeCloseTo(69.3, 0)
    })

    it('year 0 deficit ~156-157 Md', () => {
      expect(baseline[0].deficit).toBeCloseTo(156.5, 0)
    })

    it('GDP grows over 10 years', () => {
      expect(baseline[10].gdp).toBeGreaterThan(baseline[0].gdp)
    })

    it('debt ratio increases over 10 years (baseline has deficit)', () => {
      expect(baseline[10].debtRatio).toBeGreaterThan(baseline[0].debtRatio)
    })

    it('years are sequential from 2025', () => {
      baseline.forEach((entry, i) => {
        expect(entry.year).toBe(2025 + i)
      })
    })

    it('values are rounded to 1 decimal', () => {
      baseline.forEach(entry => {
        expect(entry.gdp * 10 % 1).toBeCloseTo(0, 5)
        expect(entry.debt * 10 % 1).toBeCloseTo(0, 5)
        expect(entry.deficit * 10 % 1).toBeCloseTo(0, 5)
      })
    })

    it('interest rates are in % not decimal', () => {
      expect(baseline[0].effectiveInterestRate).toBeGreaterThan(1)
      expect(baseline[0].effectiveInterestRate).toBeLessThan(20)
    })

    it('baseline unemployment stays at 7.3% (no growth deviation)', () => {
      // No policy growth effect → realGrowth = nominalGrowth - inflation = baseline realGrowth
      expect(baseline[0].unemploymentRate).toBeCloseTo(7.3, 1)
    })
  })

  describe('austerity scenario', () => {
    const austerity = projectFiscalPath({ revenueChange: 20 }, { years: 10 })
    const baseline = projectFiscalPath({}, { years: 10 })

    it('deficit is lower than baseline', () => {
      expect(austerity[0].deficit).toBeLessThan(baseline[0].deficit)
    })

    it('debt ratio improves vs baseline by year 10', () => {
      expect(austerity[10].debtRatio).toBeLessThan(baseline[10].debtRatio)
    })
  })

  describe('stimulus scenario', () => {
    const stimulus = projectFiscalPath({ spendingChange: 20 }, { years: 10 })
    const baseline = projectFiscalPath({}, { years: 10 })

    it('deficit is higher than baseline', () => {
      expect(stimulus[0].deficit).toBeGreaterThan(baseline[0].deficit)
    })

    it('debt ratio worsens vs baseline by year 10', () => {
      expect(stimulus[10].debtRatio).toBeGreaterThan(baseline[10].debtRatio)
    })
  })

  describe('growth effect', () => {
    const withGrowth = projectFiscalPath({ growthEffect: 0.005 }, { years: 10 })
    const baseline = projectFiscalPath({}, { years: 10 })

    it('GDP is higher with growth effect', () => {
      expect(withGrowth[10].gdp).toBeGreaterThan(baseline[10].gdp)
    })

    it('growth feedback reduces deficit', () => {
      expect(withGrowth[0].deficit).toBeLessThan(baseline[0].deficit)
    })

    it('debt ratio improves with growth', () => {
      expect(withGrowth[10].debtRatio).toBeLessThan(baseline[10].debtRatio)
    })

    it('positive growth effect lowers unemployment via Okun', () => {
      // Use a larger growth effect to avoid rounding to same 2-decimal value
      // growthEffect = 0.02 → realGrowthThisYear = 0.007 + 0.02 = 0.027
      // Δunemployment = (0.007 - 0.027) * 0.5 = -0.01 → 7.3 - 0.01 = 7.29
      const withLargeGrowth = projectFiscalPath({ growthEffect: 0.02 }, { years: 10 })
      expect(withLargeGrowth[0].unemploymentRate).toBeLessThan(baseline[0].unemploymentRate)
    })

    it('negative growth effect raises unemployment via Okun', () => {
      // growthEffect = -0.02 → Δunemployment = (0.007 - (0.007 - 0.02)) * 0.5 = 0.01 → 7.31
      const withNegGrowth = projectFiscalPath({ growthEffect: -0.02 }, { years: 10 })
      expect(withNegGrowth[0].unemploymentRate).toBeGreaterThan(baseline[0].unemploymentRate)
    })
  })

  describe('debt stock inertia', () => {
    it('interest rate convergence: portfolio rate moves slowly toward marginal rate', () => {
      // Apply a large political risk premium to create a big gap between
      // initial portfolio rate and new marginal rate
      const withRisk = projectFiscalPath({}, {
        years: 10,
        politicalRiskPremium: 0.05, // 500 bps
      })
      const baseline = projectFiscalPath({}, { years: 10 })

      // Year 0: interest difference should be small (inertia, rollover not applied yet)
      const interestDiffYr0 = withRisk[0].interest - baseline[0].interest

      // Year 10: interest difference should be larger (rates have converged more)
      const interestDiffYr10 = withRisk[10].interest - baseline[10].interest

      expect(interestDiffYr10).toBeGreaterThan(interestDiffYr0)
    })
  })

  describe('structural reforms', () => {
    const withReform = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.ambitious,
    })
    const baseline = projectFiscalPath({}, { years: 10 })

    it('reform phased in: year 0 boost is 0', () => {
      // Year 0 growth rate should equal baseline (ambitious has lag=2)
      expect(withReform[0].nominalGrowthRate).toBeCloseTo(baseline[0].nominalGrowthRate, 1)
    })

    it('reform boosts growth by year 5', () => {
      expect(withReform[5].nominalGrowthRate).toBeGreaterThan(baseline[5].nominalGrowthRate)
    })

    it('reform lowers debt/GDP vs no reform by year 10', () => {
      expect(withReform[10].debtRatio).toBeLessThan(baseline[10].debtRatio)
    })
  })

  describe('political risk premium', () => {
    const noRisk = projectFiscalPath({}, { years: 10 })
    const withRisk = projectFiscalPath({}, {
      years: 10,
      politicalRiskPremium: 0.02, // 200 bps
    })

    it('debt ratio is measurably worse with political risk by year 10', () => {
      const ratioDiff = withRisk[10].debtRatio - noRisk[10].debtRatio
      expect(ratioDiff).toBeGreaterThan(1) // at least 1pp worse
    })
  })

  describe('output format', () => {
    const result = projectFiscalPath({}, { years: 5 })

    it('returns correct array length', () => {
      expect(result).toHaveLength(6) // years + 1
    })

    it('each entry has all required fields including unemploymentRate', () => {
      const requiredFields = [
        'year', 'gdp', 'deficit', 'interest', 'primaryDeficit',
        'debt', 'debtRatio', 'deficitRatio', 'interestRatio',
        'effectiveInterestRate', 'nominalGrowthRate', 'riskPremiumBps',
        'unemploymentRate',
      ]
      result.forEach(entry => {
        requiredFields.forEach(field => {
          expect(entry).toHaveProperty(field)
          expect(typeof entry[field]).toBe('number')
        })
      })
    })
  })
})

// =============================================================================
// getBaselineProjection
// =============================================================================

describe('getBaselineProjection', () => {
  it('is identical to projectFiscalPath with empty policy', () => {
    const baseline = getBaselineProjection(10)
    const manual = projectFiscalPath({}, { years: 10, enableRiskPremium: true })

    expect(baseline).toEqual(manual)
  })

  it('defaults to 10 years', () => {
    const baseline = getBaselineProjection()
    expect(baseline).toHaveLength(11)
  })
})

// =============================================================================
// assessDoomLoop
// =============================================================================

describe('assessDoomLoop', () => {
  describe('feedback severity', () => {
    it('baseline 10yr shows doom loop active (marginal premium increase > 20 bps)', () => {
      const baseline = getBaselineProjection(10)
      const result = assessDoomLoop(baseline)
      expect(result.doomLoopActive).toBe(true)
      expect(result.premiumIncreaseBps).toBeGreaterThan(20)
    })

    it('returns correct structure', () => {
      const baseline = getBaselineProjection(10)
      const result = assessDoomLoop(baseline)
      expect(result).toHaveProperty('debtRatioChange')
      expect(result).toHaveProperty('interestRatioChange')
      expect(result).toHaveProperty('premiumIncreaseBps')
      expect(result).toHaveProperty('severity')
      expect(result).toHaveProperty('doomLoopActive')
    })

    it('severity is one of high/medium/low', () => {
      const baseline = getBaselineProjection(10)
      const result = assessDoomLoop(baseline)
      expect(['high', 'medium', 'low']).toContain(result.severity)
    })
  })

  describe('severity thresholds', () => {
    it('aggressive spending produces high severity', () => {
      const projection = projectFiscalPath({ spendingChange: 100 }, { years: 10 })
      const result = assessDoomLoop(projection)
      expect(result.severity).toBe('high')
    })

    it('baseline produces medium or higher severity', () => {
      const baseline = getBaselineProjection(10)
      const result = assessDoomLoop(baseline)
      expect(['high', 'medium']).toContain(result.severity)
    })

    it('aggressive austerity produces low severity', () => {
      const projection = projectFiscalPath({ revenueChange: 80 }, { years: 10 })
      const result = assessDoomLoop(projection)
      expect(result.severity).toBe('low')
    })
  })

  describe('edge cases (guarded)', () => {
    it('empty array returns safe defaults', () => {
      const result = assessDoomLoop([])
      expect(result.doomLoopActive).toBe(false)
      expect(result.severity).toBe('low')
      expect(result.debtRatioChange).toBe(0)
      expect(result.interestRatioChange).toBe(0)
      expect(result.premiumIncreaseBps).toBe(0)
    })

    it('null input returns safe defaults', () => {
      const result = assessDoomLoop(null)
      expect(result.doomLoopActive).toBe(false)
      expect(result.severity).toBe('low')
    })

    it('undefined input returns safe defaults', () => {
      const result = assessDoomLoop(undefined)
      expect(result.doomLoopActive).toBe(false)
    })

    it('deficitRatio near 0 does not produce Infinity severity', () => {
      const projection = projectFiscalPath({ revenueChange: 87.2 }, { years: 5 })
      const result = assessDoomLoop(projection)
      expect(result.severity).not.toBe(undefined)
      expect(['high', 'medium', 'low']).toContain(result.severity)
    })
  })
})

// =============================================================================
// validateProjection
// =============================================================================

describe('validateProjection', () => {
  describe('warning triggers', () => {
    it('baseline 10yr is valid (no warnings)', () => {
      const baseline = getBaselineProjection(10)
      const result = validateProjection(baseline)
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('extreme spending produces debt ratio > 200% warning', () => {
      const extreme = projectFiscalPath({ spendingChange: 200 }, { years: 20 })
      const result = validateProjection(extreme)
      expect(result.valid).toBe(false)
      expect(result.warnings.some(w => w.includes('200%'))).toBe(true)
    })

    it('extreme political risk produces interest rate > 10% warning', () => {
      const extreme = projectFiscalPath(
        { spendingChange: 100 },
        { years: 20, politicalRiskPremium: 0.05 }
      )
      const result = validateProjection(extreme)
      expect(result.valid).toBe(false)
      expect(result.warnings.some(w => w.includes('10%'))).toBe(true)
    })
  })

  describe('edge cases (documenting behavior)', () => {
    it('empty array returns valid=true', () => {
      const result = validateProjection([])
      expect(result.valid).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('single-element array returns valid=true (loop starts at i=1)', () => {
      const result = validateProjection([{ debtRatio: 300, effectiveInterestRate: 15, gdp: 100 }])
      expect(result.valid).toBe(true)
    })
  })
})

// =============================================================================
// DEMOGRAPHIC DRIFT
// =============================================================================

describe('DEMOGRAPHIC_PARAMS constants', () => {
  it('dependency ratio drift is 0.0048 per year', () => {
    expect(DEMOGRAPHIC_PARAMS.dependencyRatioDriftPerYear).toBe(0.0048)
  })

  it('pension elasticity to dependency is 0.80', () => {
    expect(DEMOGRAPHIC_PARAMS.pensionElasticityToDependency).toBe(0.80)
  })

  it('health elasticity to dependency is 0.50', () => {
    expect(DEMOGRAPHIC_PARAMS.healthElasticityToDependency).toBe(0.50)
  })

  it('pension baseline is 303.4 Md', () => {
    expect(DEMOGRAPHIC_PARAMS.pensionBaseline).toBe(303.4)
  })

  it('health baseline is 262.3 Md', () => {
    expect(DEMOGRAPHIC_PARAMS.healthBaseline).toBe(262.3)
  })

  it('DEMOGRAPHIC_PRESSURE_PER_YEAR is approximately 1.795 Md/year', () => {
    // 0.0048 * (303.4 * 0.80 + 262.3 * 0.50) = 0.0048 * 373.87 ≈ 1.795
    expect(DEMOGRAPHIC_PRESSURE_PER_YEAR).toBeCloseTo(1.795, 1)
  })
})

describe('demographic drift in projectFiscalPath', () => {
  it('year 0 has zero demographic pressure', () => {
    const result = projectFiscalPath({}, { years: 5, enableDemographicDrift: true })
    expect(result[0].demographicPressure).toBe(0)
  })

  it('year 10 has approximately 18 Md additional spending', () => {
    const result = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
    // 10 * 1.795 ≈ 17.95
    expect(result[10].demographicPressure).toBeCloseTo(17.9, 0)
  })

  it('demographic pressure increases monotonically', () => {
    const result = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
    for (let i = 1; i < result.length; i++) {
      expect(result[i].demographicPressure).toBeGreaterThanOrEqual(result[i - 1].demographicPressure)
    }
  })

  it('opt-out: enableDemographicDrift=false produces zero pressure', () => {
    const result = projectFiscalPath({}, { years: 10, enableDemographicDrift: false })
    result.forEach(entry => {
      expect(entry.demographicPressure).toBe(0)
    })
  })

  it('demographic drift worsens deficit vs opt-out', () => {
    const withDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
    const noDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: false })
    expect(withDrift[10].deficit).toBeGreaterThan(noDrift[10].deficit)
  })

  it('demographic drift worsens debt ratio vs opt-out by year 10', () => {
    const withDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
    const noDrift = projectFiscalPath({}, { years: 10, enableDemographicDrift: false })
    expect(withDrift[10].debtRatio).toBeGreaterThan(noDrift[10].debtRatio)
  })

  it('year 20 has approximately 36 Md additional spending', () => {
    const result = projectFiscalPath({}, { years: 20, enableDemographicDrift: true })
    // 20 * 1.795 ≈ 35.9
    expect(result[20].demographicPressure).toBeCloseTo(35.9, 0)
  })

  it('default is enabled (demographic drift on by default)', () => {
    const defaultResult = projectFiscalPath({}, { years: 10 })
    const explicitOn = projectFiscalPath({}, { years: 10, enableDemographicDrift: true })
    expect(defaultResult[10].demographicPressure).toBe(explicitOn[10].demographicPressure)
  })

  it('COR validation: pension pressure at year 10 is conservative vs COR adverse scenario', () => {
    // COR projects ~1% GDP (~28.5 Md) additional pension spending by 2035 at adverse scenario
    // Our pension component at year 10: 10 * 0.0048 * 303.4 * 0.80 = 11.65 Md (conservative)
    const pensionPressure10 = 10 * DEMOGRAPHIC_PARAMS.dependencyRatioDriftPerYear *
      DEMOGRAPHIC_PARAMS.pensionBaseline * DEMOGRAPHIC_PARAMS.pensionElasticityToDependency
    expect(pensionPressure10).toBeCloseTo(11.65, 0)
    expect(pensionPressure10).toBeLessThan(28.5) // Conservative vs COR adverse
  })
})

// =============================================================================
// SENIOR EMPLOYMENT
// =============================================================================

describe('SENIOR_EMPLOYMENT constants', () => {
  it('current rate is 58%', () => {
    expect(SENIOR_EMPLOYMENT.currentRate).toBe(0.58)
  })

  it('EU benchmark is 65%', () => {
    expect(SENIOR_EMPLOYMENT.euBenchmark).toBe(0.65)
  })

  it('max gain matches gap between current and benchmark', () => {
    expect(SENIOR_EMPLOYMENT.maxGain).toBeCloseTo(
      SENIOR_EMPLOYMENT.euBenchmark - SENIOR_EMPLOYMENT.currentRate, 2
    )
  })
})

describe('senior employment in projectFiscalPath', () => {
  it('zero senior revenue without reform', () => {
    const result = projectFiscalPath({}, { years: 10 })
    result.forEach(entry => {
      expect(entry.seniorRevenue).toBe(0)
    })
  })

  it('zero senior revenue during reform lag period', () => {
    const result = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.hartzIV,
    })
    // hartzIV lag = 2, so years 0 and 1 should have 0 senior revenue
    expect(result[0].seniorRevenue).toBe(0)
    expect(result[1].seniorRevenue).toBe(0)
  })

  it('positive senior revenue after reform lag', () => {
    const result = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.hartzIV,
    })
    // After lag=2, reform maturity starts
    expect(result[3].seniorRevenue).toBeGreaterThan(0)
  })

  it('hartzIV senior revenue at year 10 uses seniorEmploymentGain=0.04', () => {
    const result = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.hartzIV,
    })
    // maxGain = 0.04 (from seniorEmploymentGain)
    // rateGain = min(8 * 0.005, 0.04) = 0.04
    // additionalWorkers = 8.5M * 0.04 = 340000
    // revenue = 340000 * 14350 / 1e9 = 4.879 Md
    expect(result[10].seniorRevenue).toBeCloseTo(4.9, 0)
  })

  it('radicalFlex uses higher seniorEmploymentGain=0.06', () => {
    const result = projectFiscalPath({}, {
      years: 20,
      structuralReform: STRUCTURAL_REFORMS.radicalFlex,
    })
    // maxGain = 0.06, at year 20 maturity = 17 (lag=3), gain = min(17*0.005, 0.06) = 0.06
    // revenue = 8.5M * 0.06 * 14350 / 1e9 = 7.32 Md
    const expectedRevenue = SENIOR_EMPLOYMENT.seniorPopulation * 0.06 *
      SENIOR_EMPLOYMENT.avgCotisationsPerWorker / 1e9
    expect(result[20].seniorRevenue).toBeCloseTo(expectedRevenue, 0)
  })

  it('senior revenue caps at reform-specific max gain', () => {
    const result = projectFiscalPath({}, {
      years: 20,
      structuralReform: STRUCTURAL_REFORMS.hartzIV,
    })
    // maxGain = 0.04, at year 20 maturity = 18, gain = min(18*0.005, 0.04) = 0.04
    const maxRevenue = SENIOR_EMPLOYMENT.seniorPopulation * 0.04 *
      SENIOR_EMPLOYMENT.avgCotisationsPerWorker / 1e9
    expect(result[20].seniorRevenue).toBeCloseTo(maxRevenue, 0)
  })

  it('senior revenue reduces deficit when reform is active', () => {
    const withReform = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.hartzIV,
      enableDemographicDrift: false,
    })
    const noReform = projectFiscalPath({}, {
      years: 10,
      enableDemographicDrift: false,
    })
    // Reform adds growth AND senior revenue — deficit should be lower
    expect(withReform[10].deficit).toBeLessThan(noReform[10].deficit)
  })

  it('ambitious package also generates senior revenue', () => {
    const result = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.ambitious,
    })
    // ambitious has lag=2, so senior revenue kicks in after year 2
    expect(result[5].seniorRevenue).toBeGreaterThan(0)
  })

  it('non-labor reform does not generate senior revenue', () => {
    const result = projectFiscalPath({}, {
      years: 10,
      structuralReform: STRUCTURAL_REFORMS.energy,
    })
    result.forEach(entry => {
      expect(entry.seniorRevenue).toBe(0)
    })
  })
})

// =============================================================================
// ENERGY AND PLANNING CONSTANT CHANGES
// =============================================================================

describe('structural reform constants', () => {
  it('energy growth effect is 0.0007', () => {
    expect(STRUCTURAL_REFORMS.energy.growthEffect).toBe(0.0007)
  })

  it('hartzIV growth effect is 0.0035', () => {
    expect(STRUCTURAL_REFORMS.hartzIV.growthEffect).toBe(0.0035)
  })

  it('radicalFlex growth effect is 0.0045', () => {
    expect(STRUCTURAL_REFORMS.radicalFlex.growthEffect).toBe(0.0045)
  })

  it('housingModerate growth effect is 0.0005', () => {
    expect(STRUCTURAL_REFORMS.housingModerate.growthEffect).toBe(0.0005)
  })

  it('housingRentControl growth effect is 0.0003', () => {
    expect(STRUCTURAL_REFORMS.housingRentControl.growthEffect).toBe(0.0003)
  })

  it('housingAmbitious growth effect is 0.0025', () => {
    expect(STRUCTURAL_REFORMS.housingAmbitious.growthEffect).toBe(0.0025)
  })

  it('hartzIV has seniorEmploymentGain of 0.04', () => {
    expect(STRUCTURAL_REFORMS.hartzIV.seniorEmploymentGain).toBe(0.04)
  })

  it('radicalFlex has seniorEmploymentGain of 0.06', () => {
    expect(STRUCTURAL_REFORMS.radicalFlex.seniorEmploymentGain).toBe(0.06)
  })

  it('housing reforms have no seniorEmploymentGain', () => {
    expect(STRUCTURAL_REFORMS.housingModerate.seniorEmploymentGain).toBeUndefined()
    expect(STRUCTURAL_REFORMS.housingRentControl.seniorEmploymentGain).toBeUndefined()
    expect(STRUCTURAL_REFORMS.housingAmbitious.seniorEmploymentGain).toBeUndefined()
  })

  it('old laborMarket and planning keys are removed', () => {
    expect(STRUCTURAL_REFORMS.laborMarket).toBeUndefined()
    expect(STRUCTURAL_REFORMS.planning).toBeUndefined()
  })
})

describe('SOCIAL_HOUSING_LIQUIDATION constants', () => {
  it('total asset value is 750 Md', () => {
    expect(SOCIAL_HOUSING_LIQUIDATION.totalAssetValue).toBe(750)
  })

  it('sale duration is 10 years', () => {
    expect(SOCIAL_HOUSING_LIQUIDATION.saleDurationYears).toBe(10)
  })

  it('annual proceeds is 75 Md', () => {
    expect(SOCIAL_HOUSING_LIQUIDATION.annualProceeds).toBe(75)
  })

  it('growth effect is 0.0002', () => {
    expect(SOCIAL_HOUSING_LIQUIDATION.growthEffect).toBe(0.0002)
  })
})

describe('social housing liquidation in projectFiscalPath', () => {
  it('year 0 has zero windfall', () => {
    const result = projectFiscalPath({}, { years: 10, enableSocialHousingLiquidation: true })
    expect(result[0].socialHousingWindfall).toBe(0)
  })

  it('years 1-10 have 75 Md windfall', () => {
    const result = projectFiscalPath({}, { years: 12, enableSocialHousingLiquidation: true })
    for (let t = 1; t <= 10; t++) {
      expect(result[t].socialHousingWindfall).toBe(75)
    }
  })

  it('year 11+ has zero windfall', () => {
    const result = projectFiscalPath({}, { years: 12, enableSocialHousingLiquidation: true })
    expect(result[11].socialHousingWindfall).toBe(0)
    expect(result[12].socialHousingWindfall).toBe(0)
  })

  it('social housing reduces deficit during years 1-10', () => {
    const withHousing = projectFiscalPath({}, { years: 10, enableSocialHousingLiquidation: true })
    const noHousing = projectFiscalPath({}, { years: 10, enableSocialHousingLiquidation: false })
    expect(withHousing[5].deficit).toBeLessThan(noHousing[5].deficit)
  })

  it('social housing reduces debt ratio at year 10', () => {
    const withHousing = projectFiscalPath({}, { years: 10, enableSocialHousingLiquidation: true })
    const noHousing = projectFiscalPath({}, { years: 10, enableSocialHousingLiquidation: false })
    expect(withHousing[10].debtRatio).toBeLessThan(noHousing[10].debtRatio)
  })

  it('disabled by default', () => {
    const result = projectFiscalPath({}, { years: 5 })
    result.forEach(entry => {
      expect(entry.socialHousingWindfall).toBe(0)
    })
  })
})

// =============================================================================
// PENSION REFORM CONSTANTS
// =============================================================================

describe('PENSION_REFORM constants', () => {
  it('pension mass matches DEMOGRAPHIC_PARAMS.pensionBaseline', () => {
    expect(PENSION_REFORM.pensionMass).toBe(303.4)
    expect(PENSION_REFORM.pensionMass).toBe(DEMOGRAPHIC_PARAMS.pensionBaseline)
  })

  it('cotisantsPerRetraite is 1.70', () => {
    expect(PENSION_REFORM.cotisantsPerRetraite).toBe(1.70)
  })

  it('retirement age current is 64', () => {
    expect(PENSION_REFORM.retirementAge.current).toBe(64)
  })

  it('pension mass effect per year is -2.5%', () => {
    expect(PENSION_REFORM.retirementAge.pensionMassEffectPerYear).toBe(-0.025)
  })

  it('notional accounts reduction is 6%', () => {
    expect(PENSION_REFORM.notionnel.pensionMassReduction).toBe(0.06)
  })

  it('pension floor is 65%', () => {
    expect(PENSION_REFORM.pensionFloor).toBe(0.65)
  })
})

// =============================================================================
// PENSION REFORM IN projectFiscalPath
// =============================================================================

describe('pension reform in projectFiscalPath', () => {
  describe('retirement age mechanics', () => {
    it('year 0 has zero pension reform saving (ramp factor = 0)', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 67, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      expect(result[0].pensionReformSaving).toBe(0)
    })

    it('ramp-up: year 4 effect is 50% at rampUpYears=8', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 67, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      // ageAboveCurrent = 3, rampFactor at t=4 = 4/8 = 0.5
      // saving = 303.4 * 3 * 0.025 * 0.5 = 11.3775
      expect(result[4].pensionReformSaving).toBeCloseTo(11.4, 0)
    })

    it('retirement age 67 at year 10 produces significant saving', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 67, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      // ageAboveCurrent = 3, rampFactor at t=10 = min(10/8, 1) = 1
      // saving = 303.4 * 3 * 0.025 * 1 = 22.755
      expect(result[10].pensionReformSaving).toBeCloseTo(22.8, 0)
    })

    it('retirement age below current (60) produces negative saving (higher spending)', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 60, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      // ageAboveCurrent = -4, but we use Math.abs so saving is positive... wait
      // Actually: ageAboveCurrent = -4, saving = 303.4 * (-4) * 0.025 * ramp = negative
      // No — the code has: pensionReformSaving += basePensionMass * ageAboveCurrent * Math.abs(pensionMassEffectPerYear) * rampFactor
      // ageAboveCurrent = -4, so this is negative → savings are negative
      // Then Math.min(pensionReformSaving, maxSaving) — maxSaving is positive ~106
      // So negative savings pass through
      expect(result[10].pensionReformSaving).toBeLessThan(0)
    })
  })

  describe('desindexation mechanics', () => {
    it('year 0 has zero desindexation saving', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 64, desindexation: 1.5, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      expect(result[0].pensionReformSaving).toBe(0)
    })

    it('desindexation savings increase over time (cumulative)', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 64, desindexation: 1.5, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      // Cumulative: annualReduction = 1.5 * 0.005 = 0.0075
      // year 5 (past ramp): saving = 303.4 * 0.0075 * 5 = 11.4
      expect(result[5].pensionReformSaving).toBeCloseTo(11.4, 0)
      // year 10: saving = 303.4 * 0.0075 * 10 = 22.755
      expect(result[10].pensionReformSaving).toBeCloseTo(22.8, 0)
    })

    it('desindexation ramp-up over 3 years', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 64, desindexation: 1.0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      // year 1: ramp = 1/3, annualReduction = 0.005, saving = 303.4 * 0.005 * 1 * (1/3) = 0.506
      expect(result[1].pensionReformSaving).toBeCloseTo(0.5, 0)
      // year 3: ramp = 1, saving = 303.4 * 0.005 * 3 = 4.551
      expect(result[3].pensionReformSaving).toBeCloseTo(4.6, 0)
    })
  })

  describe('pension cap mechanics', () => {
    it('year 0 has zero pension cap saving', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 15, notionnel: false, capitalisation: 0 },
      })
      expect(result[0].pensionReformSaving).toBe(0)
    })

    it('pension cap ramps up over 3 years', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 10, notionnel: false, capitalisation: 0 },
      })
      // year 1: ramp = 1/3, saving = 303.4 * 0.10 * (1/3) = 10.11
      expect(result[1].pensionReformSaving).toBeCloseTo(10.1, 0)
      // year 3+: full, saving = 303.4 * 0.10 = 30.34
      expect(result[3].pensionReformSaving).toBeCloseTo(30.3, 0)
    })

    it('max pension cap (20%) at full ramp', () => {
      const result = projectFiscalPath({}, {
        years: 5,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 20, notionnel: false, capitalisation: 0 },
      })
      // year 5: saving = 303.4 * 0.20 = 60.68
      expect(result[5].pensionReformSaving).toBeCloseTo(60.7, 0)
    })
  })

  describe('notional accounts', () => {
    it('no effect before startYear (2027 = t=2)', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: true, capitalisation: 0 },
      })
      // t=0 (2025): yearsActive = max(0, 0 - 2) = 0
      expect(result[0].pensionReformSaving).toBe(0)
      // t=1 (2026): yearsActive = max(0, 1 - 2) = 0
      expect(result[1].pensionReformSaving).toBe(0)
    })

    it('ramps up after startYear', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: true, capitalisation: 0 },
      })
      // t=5 (2030): yearsActive = 3, ramp = 3/15 = 0.2
      // saving = 303.4 * 0.06 * 0.2 = 3.6408
      expect(result[5].pensionReformSaving).toBeCloseTo(3.6, 0)
    })

    it('full effect after 15 years from startYear', () => {
      const result = projectFiscalPath({}, {
        years: 20,
        pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: true, capitalisation: 0 },
      })
      // t=17 (2042): yearsActive = 15, ramp = 1.0
      // saving = 303.4 * 0.06 = 18.204
      expect(result[17].pensionReformSaving).toBeCloseTo(18.2, 0)
    })
  })

  describe('pension floor', () => {
    it('extreme reform combo is capped at 35% of baseline', () => {
      const result = projectFiscalPath({}, {
        years: 20,
        pensionReform: { retirementAge: 72, desindexation: 2, pensionCap: 20, notionnel: true, capitalisation: 0 },
      })
      const maxSaving = PENSION_REFORM.pensionMass * (1 - PENSION_REFORM.pensionFloor)
      // maxSaving = 303.4 * 0.35 = 106.19
      result.forEach(entry => {
        expect(entry.pensionReformSaving).toBeLessThanOrEqual(maxSaving + 0.1) // rounding tolerance
      })
    })

    it('moderate reform does not hit floor', () => {
      const result = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 66, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      const maxSaving = PENSION_REFORM.pensionMass * (1 - PENSION_REFORM.pensionFloor)
      expect(result[10].pensionReformSaving).toBeLessThan(maxSaving)
    })
  })

  describe('pension reform reduces deficit', () => {
    it('pension reform at age 67 reduces deficit vs baseline at year 10', () => {
      const baseline = projectFiscalPath({}, { years: 10 })
      const withReform = projectFiscalPath({}, {
        years: 10,
        pensionReform: { retirementAge: 67, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
      })
      expect(withReform[10].deficit).toBeLessThan(baseline[10].deficit)
    })
  })

  describe('no pension reform = no saving', () => {
    it('null pensionReform produces zero saving', () => {
      const result = projectFiscalPath({}, { years: 10 })
      result.forEach(entry => {
        expect(entry.pensionReformSaving).toBe(0)
      })
    })
  })
})

// =============================================================================
// MIGRATION FISCAL IMPACT
// =============================================================================

describe('MIGRATION_PARAMS constants', () => {
  it('immigration annual flow is 270000', () => {
    expect(MIGRATION_PARAMS.immigration.annualFlow).toBe(270000)
  })

  it('emigration annual flow is 200000', () => {
    expect(MIGRATION_PARAMS.emigration.annualFlow).toBe(200000)
  })

  it('net worker change per year is negative (brain drain)', () => {
    expect(MIGRATION_NET_WORKERS_PER_YEAR).toBeLessThan(0)
    // 115425 - 193600 = -78175
    expect(MIGRATION_NET_WORKERS_PER_YEAR).toBeCloseTo(-78175, 0)
  })
})

describe('migration fiscal impact in projectFiscalPath', () => {
  it('year 0 has zero migration impact', () => {
    const result = projectFiscalPath({}, { years: 5 })
    expect(result[0].migrationImpact).toBeCloseTo(0, 1)
  })

  it('year 10 has approximately -11.2 Md impact', () => {
    const result = projectFiscalPath({}, { years: 10 })
    // 10 * -78175 * 14350 / 1e9 = -11.218
    expect(result[10].migrationImpact).toBeCloseTo(-11.2, 0)
  })

  it('opt-out produces zero migration impact', () => {
    const result = projectFiscalPath({}, { years: 10, enableMigrationImpact: false })
    result.forEach(entry => {
      expect(entry.migrationImpact).toBe(0)
    })
  })

  it('migration impact worsens deficit (adds to spending pressure)', () => {
    const withMigration = projectFiscalPath({}, { years: 10, enableMigrationImpact: true, enableDependanceDrift: false, enableDemographicDrift: false })
    const noMigration = projectFiscalPath({}, { years: 10, enableMigrationImpact: false, enableDependanceDrift: false, enableDemographicDrift: false })
    expect(withMigration[10].deficit).toBeGreaterThan(noMigration[10].deficit)
  })
})

// =============================================================================
// DEPENDANCE SPENDING
// =============================================================================

describe('DEPENDANCE_PARAMS constants', () => {
  it('baseline is 43.5 Md', () => {
    expect(DEPENDANCE_PARAMS.baseline).toBe(43.5)
  })

  it('annual growth rate is 5.5%', () => {
    expect(DEPENDANCE_PARAMS.annualGrowthRate).toBe(0.055)
  })
})

describe('dependance pressure in projectFiscalPath', () => {
  it('year 0 has zero dependance pressure', () => {
    const result = projectFiscalPath({}, { years: 5 })
    expect(result[0].dependancePressure).toBe(0)
  })

  it('year 10 has significant excess dependance spending', () => {
    const result = projectFiscalPath({}, { years: 10 })
    // 43.5 * ((1.055)^10 - (1.025)^10) = 43.5 * (1.7081 - 1.2801) = 43.5 * 0.4280 ≈ 18.6
    const expected = DEPENDANCE_PARAMS.baseline *
      (Math.pow(1 + DEPENDANCE_PARAMS.annualGrowthRate, 10) -
       Math.pow(1 + DEPENDANCE_PARAMS.gdpGrowthBaseline, 10))
    expect(result[10].dependancePressure).toBeCloseTo(expected, 0)
  })

  it('opt-out produces zero dependance pressure', () => {
    const result = projectFiscalPath({}, { years: 10, enableDependanceDrift: false })
    result.forEach(entry => {
      expect(entry.dependancePressure).toBe(0)
    })
  })
})
