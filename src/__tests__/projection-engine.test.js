import { describe, it, expect } from 'vitest'
import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  ROLLOVER_RATE,
  DEFICIT_STRESS_THRESHOLD,
  DEFICIT_STRESS_SENSITIVITY,
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
    expect(MACRO_BASELINE.baseInterestRate).toBe(0.0017)
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

    it('accepts custom base rate', () => {
      const rate = calculateInterestRate(0, 0, { baseRate: 0.03 })
      expect(rate).toBeCloseTo(0.03, 6)
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
  const laborMarket = STRUCTURAL_REFORMS.laborMarket
  // growthEffect: 0.0015, lag: 2, duration: 10

  describe('phase lifecycle (laborMarket)', () => {
    it('returns 0 at year 0', () => {
      expect(calculateReformGrowthBoost(0, laborMarket)).toBe(0)
    })

    it('linear phase-in at year 1 (50% of effect)', () => {
      expect(calculateReformGrowthBoost(1, laborMarket)).toBeCloseTo(0.00075, 6)
    })

    it('reaches full effect at lag year', () => {
      expect(calculateReformGrowthBoost(2, laborMarket)).toBeCloseTo(0.0015, 6)
    })

    it('maintains full effect during peak period', () => {
      expect(calculateReformGrowthBoost(5, laborMarket)).toBeCloseTo(0.0015, 6)
      expect(calculateReformGrowthBoost(11, laborMarket)).toBeCloseTo(0.0015, 6)
    })

    it('begins decay at lag+duration', () => {
      // year 12 = lag(2) + duration(10), yearsSincePeak = 0
      // effect = 0.0015 * 0.93^0 = 0.0015
      expect(calculateReformGrowthBoost(12, laborMarket)).toBeCloseTo(0.0015, 6)
    })

    it('decays exponentially after peak', () => {
      // year 13: 0.0015 * 0.93^1 = 0.001395
      expect(calculateReformGrowthBoost(13, laborMarket)).toBeCloseTo(0.001395, 6)
      // year 15: 0.0015 * 0.93^3
      expect(calculateReformGrowthBoost(15, laborMarket)).toBeCloseTo(
        0.0015 * Math.pow(0.93, 3), 6
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
      // year = -1, boost = 0.0015 * (-1/2) = -0.00075
      const boost = calculateReformGrowthBoost(-1, laborMarket)
      expect(boost).toBeCloseTo(-0.00075, 6)
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
