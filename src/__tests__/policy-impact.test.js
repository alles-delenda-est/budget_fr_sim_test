import { describe, it, expect } from 'vitest'
import { BASELINE, PRESETS, PENSION_REFORM_PRESETS, calculatePolicyImpact, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS, ONDAM_FLOOR, applyOndamFloor } from '../policy-impact'

// =============================================================================
// BASELINE constants - regression guards
// =============================================================================

describe('BASELINE constants', () => {
  it('état revenue total is 315.3', () => {
    expect(BASELINE.etat.revenuTotal).toBe(315.3)
  })

  it('état spending total is 444.97', () => {
    expect(BASELINE.etat.spendingTotal).toBe(444.97)
  })

  it('état revenue components sum to revenuTotal', () => {
    const { incomeTax, vat, corporateTax, otherTax } = BASELINE.etat
    expect(incomeTax + vat + corporateTax + otherTax).toBeCloseTo(BASELINE.etat.revenuTotal, 1)
  })

  it('état spending components sum to spendingTotal', () => {
    const { education, defense, solidarity, ecological, otherSpending } = BASELINE.etat
    expect(education + defense + solidarity + ecological + otherSpending)
      .toBeCloseTo(BASELINE.etat.spendingTotal, 1)
  })

  it('SS revenue total is 659.4', () => {
    expect(BASELINE.securiteSociale.revenuTotal).toBe(659.4)
  })

  it('SS spending total is 686.6', () => {
    expect(BASELINE.securiteSociale.spendingTotal).toBe(686.6)
  })

  it('SS revenue components sum to revenuTotal', () => {
    const ss = BASELINE.securiteSociale
    const sum = ss.cotisations + ss.csg + ss.impotsTaxes +
                ss.cotisationsEtat + ss.transferts + ss.autresProduits
    expect(sum).toBeCloseTo(ss.revenuTotal, 1)
  })

  it('SS spending components sum to spendingTotal', () => {
    const ss = BASELINE.securiteSociale
    const sum = ss.maladie + ss.vieillesse + ss.famille + ss.atmp + ss.autonomie
    expect(sum).toBeCloseTo(ss.spendingTotal, 1)
  })

  it('integrated revenue = état + SS', () => {
    expect(BASELINE.integrated.revenuTotal)
      .toBeCloseTo(BASELINE.etat.revenuTotal + BASELINE.securiteSociale.revenuTotal, 1)
  })

  it('integrated spending = état + SS', () => {
    expect(BASELINE.integrated.spendingTotal)
      .toBeCloseTo(BASELINE.etat.spendingTotal + BASELINE.securiteSociale.spendingTotal, 1)
  })

  it('integrated deficit = état deficit + SS deficit', () => {
    expect(BASELINE.integrated.deficit)
      .toBeCloseTo(BASELINE.etat.deficit + BASELINE.securiteSociale.deficit, 1)
  })
})

// =============================================================================
// BEHAVIORAL_RESPONSE and FISCAL_MULTIPLIERS constants
// =============================================================================

describe('BEHAVIORAL_RESPONSE constants', () => {
  it('has all expected tax types', () => {
    expect(BEHAVIORAL_RESPONSE).toHaveProperty('incomeTax')
    expect(BEHAVIORAL_RESPONSE).toHaveProperty('corporateTax')
    expect(BEHAVIORAL_RESPONSE).toHaveProperty('vat')
    expect(BEHAVIORAL_RESPONSE).toHaveProperty('csg')
    expect(BEHAVIORAL_RESPONSE).toHaveProperty('socialContributions')
  })

  it('each type has increaseEfficiency, decreaseEfficiency, growthDragPerPp', () => {
    for (const [, val] of Object.entries(BEHAVIORAL_RESPONSE)) {
      expect(val).toHaveProperty('increaseEfficiency')
      expect(val).toHaveProperty('decreaseEfficiency')
      expect(val).toHaveProperty('growthDragPerPp')
    }
  })

  it('increaseEfficiency < 1 for all types (haircutting)', () => {
    for (const [, val] of Object.entries(BEHAVIORAL_RESPONSE)) {
      expect(val.increaseEfficiency).toBeLessThan(1)
    }
  })

  it('decreaseEfficiency >= 1 for all types (supply-side boost)', () => {
    for (const [, val] of Object.entries(BEHAVIORAL_RESPONSE)) {
      expect(val.decreaseEfficiency).toBeGreaterThanOrEqual(1)
    }
  })

  it('growthDragPerPp < 0 for all types (drag for increases)', () => {
    for (const [, val] of Object.entries(BEHAVIORAL_RESPONSE)) {
      expect(val.growthDragPerPp).toBeLessThan(0)
    }
  })
})

describe('FISCAL_MULTIPLIERS constants', () => {
  it('has all expected spending categories', () => {
    expect(FISCAL_MULTIPLIERS).toHaveProperty('education')
    expect(FISCAL_MULTIPLIERS).toHaveProperty('defense')
    expect(FISCAL_MULTIPLIERS).toHaveProperty('solidarity')
    expect(FISCAL_MULTIPLIERS).toHaveProperty('pensions')
    expect(FISCAL_MULTIPLIERS).toHaveProperty('health')
  })

  it('each category has expansion and recession multipliers', () => {
    for (const [, val] of Object.entries(FISCAL_MULTIPLIERS)) {
      expect(val).toHaveProperty('expansion')
      expect(val).toHaveProperty('recession')
    }
  })

  it('recession multipliers >= expansion multipliers (larger in downturns)', () => {
    for (const [, val] of Object.entries(FISCAL_MULTIPLIERS)) {
      expect(val.recession).toBeGreaterThanOrEqual(val.expansion)
    }
  })
})

// =============================================================================
// Individual revenue levers — with behavioral response
// =============================================================================

describe('calculatePolicyImpact - revenue levers', () => {
  describe('income tax (IR)', () => {
    it('+1pp produces ~5.93 Md revenue (static × 70% efficiency)', () => {
      const result = calculatePolicyImpact({ incomeTaxChange: 1 })
      // 1 * 94.1 / 10 * 0.9 * 0.70 = 5.9283
      expect(result.revenueChange).toBeCloseTo(5.928, 2)
    })

    it('+2pp produces 2x the impact (linearity for increases)', () => {
      const one = calculatePolicyImpact({ incomeTaxChange: 1 })
      const two = calculatePolicyImpact({ incomeTaxChange: 2 })
      expect(two.revenueChange).toBeCloseTo(one.revenueChange * 2, 2)
    })

    it('decrease uses decreaseEfficiency (105%), not increaseEfficiency', () => {
      const neg = calculatePolicyImpact({ incomeTaxChange: -1 })
      // -1 * 94.1 / 10 * 0.9 * 1.05 = -8.8925
      expect(neg.revenueChange).toBeCloseTo(-8.893, 2)
    })

    it('decrease revenue exceeds increase revenue in absolute terms (asymmetry)', () => {
      const pos = calculatePolicyImpact({ incomeTaxChange: 1 })
      const neg = calculatePolicyImpact({ incomeTaxChange: -1 })
      expect(Math.abs(neg.revenueChange)).toBeGreaterThan(Math.abs(pos.revenueChange))
    })
  })

  describe('VAT (TVA)', () => {
    it('+1pp produces ~4.26 Md revenue (static × 92% efficiency)', () => {
      const result = calculatePolicyImpact({ vatChange: 1 })
      // 1 * 97.5 / 20 * 0.95 * 0.92 = 4.26075
      expect(result.revenueChange).toBeCloseTo(4.261, 2)
    })

    it('linearity: +2pp = 2x', () => {
      const one = calculatePolicyImpact({ vatChange: 1 })
      const two = calculatePolicyImpact({ vatChange: 2 })
      expect(two.revenueChange).toBeCloseTo(one.revenueChange * 2, 2)
    })
  })

  describe('corporate tax (IS)', () => {
    it('+1pp produces ~0.90 Md revenue (static × 55% efficiency)', () => {
      const result = calculatePolicyImpact({ corpTaxChange: 1 })
      // 1 * 58.2 / 25 * 0.7 * 0.55 = 0.89628
      expect(result.revenueChange).toBeCloseTo(0.896, 2)
    })

    it('-1pp applies decreaseEfficiency 110% (investment attraction)', () => {
      const result = calculatePolicyImpact({ corpTaxChange: -1 })
      // -1 * 58.2 / 25 * 0.7 * 1.10 = -1.79256
      expect(result.revenueChange).toBeCloseTo(-1.793, 2)
    })
  })

  describe('social contributions (cotisations)', () => {
    it('+1pp produces ~5.26 Md revenue (static × 58% efficiency)', () => {
      const result = calculatePolicyImpact({ socialContributions: 1 })
      // 1 * 372.0 / 41 * 0.58 = 5.26244
      expect(result.revenueChange).toBeCloseTo(5.262, 2)
    })
  })

  describe('CSG', () => {
    it('+1pp produces ~12.03 Md revenue (static × 82% efficiency)', () => {
      const result = calculatePolicyImpact({ csgRate: 1 })
      // 1 * 135.0 / 9.2 * 0.82 = 12.03261
      expect(result.revenueChange).toBeCloseTo(12.033, 2)
    })
  })

  describe('revenue breakdown by sector', () => {
    it('income tax goes to état', () => {
      const result = calculatePolicyImpact({ incomeTaxChange: 1 })
      expect(result.etat.revenue).toBeCloseTo(5.928, 2)
      expect(result.ss.revenue).toBe(0)
    })

    it('CSG goes to sécurité sociale', () => {
      const result = calculatePolicyImpact({ csgRate: 1 })
      expect(result.ss.revenue).toBeCloseTo(12.033, 2)
      expect(result.etat.revenue).toBe(0)
    })
  })
})

// =============================================================================
// Individual spending levers
// =============================================================================

describe('calculatePolicyImpact - spending levers', () => {
  describe('education', () => {
    it('+10% produces 8.89 Md spending increase', () => {
      const result = calculatePolicyImpact({ spendingEducation: 10 })
      // 10 * 88.9 / 100 = 8.89
      expect(result.spendingChange).toBeCloseTo(8.89, 2)
    })
  })

  describe('defense', () => {
    it('-15% produces -9.75 Md spending decrease', () => {
      const result = calculatePolicyImpact({ spendingDefense: -15 })
      // -15 * 65.0 / 100 = -9.75
      expect(result.spendingChange).toBeCloseTo(-9.75, 2)
    })
  })

  describe('pension indexation', () => {
    it('+1pp produces 3.034 Md spending increase', () => {
      const result = calculatePolicyImpact({ pensionIndexation: 1 })
      // 1 * 303.4 / 100 = 3.034
      expect(result.spendingChange).toBeCloseTo(3.034, 2)
    })
  })

  describe('health spending', () => {
    it('+10% produces 26.23 Md spending increase (no ONDAM floor for increases)', () => {
      const result = calculatePolicyImpact({ healthSpending: 10 })
      // 10 * 262.3 / 100 = 26.23 (positive, not affected by floor)
      expect(result.spendingChange).toBeCloseTo(26.23, 2)
    })
  })

  describe('spending breakdown by sector', () => {
    it('education goes to état', () => {
      const result = calculatePolicyImpact({ spendingEducation: 10 })
      expect(result.etat.spending).toBeCloseTo(8.89, 2)
      expect(result.ss.spending).toBe(0)
    })

    it('pension goes to sécurité sociale', () => {
      const result = calculatePolicyImpact({ pensionIndexation: 1 })
      expect(result.ss.spending).toBeCloseTo(3.034, 2)
      expect(result.etat.spending).toBe(0)
    })
  })
})

// =============================================================================
// Growth effects — behavioral tax response + fiscal multipliers
// =============================================================================

describe('calculatePolicyImpact - growth effects', () => {
  it('corp tax increases create negative growth drag', () => {
    const result = calculatePolicyImpact({ corpTaxChange: 5 })
    // growthDrag = -0.0025 * 5 = -0.0125
    expect(result.growthEffect).toBeCloseTo(-0.0125, 4)
  })

  it('corp tax cuts produce zero direct growth drag (max(0, lever) = 0)', () => {
    const result = calculatePolicyImpact({ corpTaxChange: -5 })
    expect(result.growthEffect).toBe(0)
  })

  it('income tax increase creates growth drag', () => {
    const result = calculatePolicyImpact({ incomeTaxChange: 5 })
    // growthDrag = -0.0012 * 5 = -0.006
    expect(result.growthEffect).toBeCloseTo(-0.006, 4)
  })

  it('spending cuts create growth drag (negative multiplier effect)', () => {
    const result = calculatePolicyImpact({ spendingEducation: -20 })
    // educationSpending = -20 * 88.9/100 = -17.78
    // growth = -17.78 / 2850 * 0.90 = -0.005614
    expect(result.growthEffect).toBeLessThan(0)
    expect(result.growthEffect).toBeCloseTo(-0.005614, 4)
  })

  it('spending increases create positive growth effect (multiplier)', () => {
    const result = calculatePolicyImpact({ spendingEducation: 20 })
    // educationSpending = 17.78, growth = 17.78 / 2850 * 0.90 = +0.005614
    expect(result.growthEffect).toBeGreaterThan(0)
    expect(result.growthEffect).toBeCloseTo(0.005614, 4)
  })

  it('social contribution cuts produce zero direct growth drag', () => {
    const result = calculatePolicyImpact({ socialContributions: -2 })
    expect(result.growthEffect).toBe(0)
  })

  it('social contribution increases produce negative growth drag', () => {
    const result = calculatePolicyImpact({ socialContributions: 2 })
    // growthDrag = -0.0018 * 2 = -0.0036
    expect(result.growthEffect).toBeCloseTo(-0.0036, 4)
  })

  it('NFP tax increases produce significant negative growth drag', () => {
    // NFP: IR+5, IS+3, CSG+2 → all increases
    const result = calculatePolicyImpact(PRESETS.nfp.levers)
    // Tax drags: IR=-0.006, IS=-0.0075, CSG=-0.0016 → total ≈ -0.0151
    // Plus spending multiplier boosts
    expect(result.growthEffect).toBeLessThan(0)
  })

  it('GL spending cuts produce negative multiplier growth effect', () => {
    const result = calculatePolicyImpact(PRESETS.generationLibre.levers)
    // Big spending cuts dominate over zero tax drags (all cuts)
    // But GL also has education, solidarity, health cuts → all negative multipliers
    expect(result.growthEffect).toBeLessThan(0)
  })
})

// =============================================================================
// Zero inputs
// =============================================================================

describe('calculatePolicyImpact - zero inputs', () => {
  it('all defaults produce zero impact', () => {
    const result = calculatePolicyImpact({})
    expect(result.revenueChange).toBe(0)
    expect(result.spendingChange).toBe(0)
    expect(result.growthEffect).toBe(0)
  })

  it('correct structure with zero inputs', () => {
    const result = calculatePolicyImpact({})
    expect(result).toHaveProperty('revenueChange')
    expect(result).toHaveProperty('spendingChange')
    expect(result).toHaveProperty('growthEffect')
    expect(result).toHaveProperty('etat')
    expect(result).toHaveProperty('ss')
    expect(result.etat).toHaveProperty('revenue')
    expect(result.etat).toHaveProperty('spending')
    expect(result.ss).toHaveProperty('revenue')
    expect(result.ss).toHaveProperty('spending')
  })

  it('no argument produces zero impact', () => {
    const result = calculatePolicyImpact()
    expect(result.revenueChange).toBe(0)
    expect(result.spendingChange).toBe(0)
    expect(result.growthEffect).toBe(0)
  })
})

// =============================================================================
// Slider extremes
// =============================================================================

describe('calculatePolicyImpact - slider extremes', () => {
  it('all revenues at max produces large positive revenue change', () => {
    const result = calculatePolicyImpact({
      incomeTaxChange: 10,   // max
      vatChange: 5,          // max
      corpTaxChange: 5,      // max
      socialContributions: 5, // max
      csgRate: 2,            // max
    })
    expect(result.revenueChange).toBeGreaterThan(80)
  })

  it('all revenues at min produces large negative revenue change', () => {
    const result = calculatePolicyImpact({
      incomeTaxChange: -10,
      vatChange: -5,
      corpTaxChange: -10,
      socialContributions: -5,
      csgRate: -2,
    })
    expect(result.revenueChange).toBeLessThan(-100)
  })

  it('all spending at max produces large positive spending change', () => {
    const result = calculatePolicyImpact({
      spendingEducation: 20,   // max
      spendingDefense: 15,     // max
      spendingSolidarity: 30,  // max
      pensionIndexation: 1,    // max
      healthSpending: 10,      // max
    })
    expect(result.spendingChange).toBeGreaterThan(50)
  })

  it('all spending at min produces large negative spending change', () => {
    const result = calculatePolicyImpact({
      spendingEducation: -20,
      spendingDefense: -15,
      spendingSolidarity: -30,
      pensionIndexation: -2,
      healthSpending: -10,
    })
    expect(result.spendingChange).toBeLessThan(-50)
  })

  it('combined max austerity improves deficit by ~150+ Md', () => {
    const result = calculatePolicyImpact({
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
    const deficitImprovement = result.revenueChange - result.spendingChange
    expect(deficitImprovement).toBeGreaterThan(150)
  })

  it('combined max stimulus worsens deficit by ~200+ Md', () => {
    const result = calculatePolicyImpact({
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
    const deficitWorsening = result.revenueChange - result.spendingChange
    expect(deficitWorsening).toBeLessThan(-150)
  })
})

// =============================================================================
// Preset scenarios
// =============================================================================

describe('calculatePolicyImpact - presets', () => {
  it('PLF2025 produces net austerity (deficit improvement)', () => {
    const result = calculatePolicyImpact(PRESETS.plf2025.levers)
    const improvement = result.revenueChange - result.spendingChange
    expect(improvement).toBeGreaterThan(0)
  })

  it('Knafo produces net austerity (spending cuts > revenue cuts)', () => {
    const result = calculatePolicyImpact(PRESETS.knafo.levers)
    const improvement = result.revenueChange - result.spendingChange
    expect(improvement).toBeGreaterThan(10)
  })

  it('Knafo cuts revenue', () => {
    const result = calculatePolicyImpact(PRESETS.knafo.levers)
    expect(result.revenueChange).toBeLessThan(0)
  })

  it('Knafo cuts spending more than revenue', () => {
    const result = calculatePolicyImpact(PRESETS.knafo.levers)
    expect(Math.abs(result.spendingChange)).toBeGreaterThan(Math.abs(result.revenueChange))
  })

  it('NFP raises revenue (tax increases, behaviorally adjusted)', () => {
    const result = calculatePolicyImpact(PRESETS.nfp.levers)
    expect(result.revenueChange).toBeGreaterThan(0)
  })

  it('NFP raises spending', () => {
    const result = calculatePolicyImpact(PRESETS.nfp.levers)
    expect(result.spendingChange).toBeGreaterThan(0)
  })

  it('NFP revenue corrected to ~56 Md (not 77 Md) due to ETI haircuts', () => {
    const result = calculatePolicyImpact(PRESETS.nfp.levers)
    // IR+5: 5*94.1/10*0.9*0.70 ≈ 29.6
    // IS+3: 3*58.2/25*0.7*0.55 ≈ 2.7
    // CSG+2: 2*135/9.2*0.82 ≈ 24.1
    // Total ≈ 56.4 Md (down from ~76.6 Md static)
    expect(result.revenueChange).toBeGreaterThan(40)
    expect(result.revenueChange).toBeLessThan(65)
  })

  it('Génération Libre cuts both revenue and spending', () => {
    const result = calculatePolicyImpact(PRESETS.generationLibre.levers)
    expect(result.revenueChange).toBeLessThan(0)
    expect(result.spendingChange).toBeLessThan(0)
  })

  it('each preset produces correct shape', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      const result = calculatePolicyImpact(preset.levers)
      expect(result).toHaveProperty('revenueChange')
      expect(result).toHaveProperty('spendingChange')
      expect(result).toHaveProperty('growthEffect')
      expect(result).toHaveProperty('etat')
      expect(result).toHaveProperty('ss')
    }
  })
})

// =============================================================================
// ONDAM FLOOR CONSTRAINT
// =============================================================================

describe('ONDAM_FLOOR constants', () => {
  it('threshold is -3%', () => {
    expect(ONDAM_FLOOR.threshold).toBe(-3)
  })

  it('damping factor is 0.50', () => {
    expect(ONDAM_FLOOR.dampingFactor).toBe(0.50)
  })

  it('hard floor is -7%', () => {
    expect(ONDAM_FLOOR.hardFloor).toBe(-7)
  })
})

describe('applyOndamFloor', () => {
  it('no constraint for positive health spending', () => {
    const result = applyOndamFloor(5)
    expect(result.effectiveCut).toBe(5)
    expect(result.warning).toBeNull()
  })

  it('no constraint at threshold (-3%)', () => {
    const result = applyOndamFloor(-3)
    expect(result.effectiveCut).toBe(-3)
    expect(result.warning).toBeNull()
  })

  it('no constraint for mild cuts above threshold', () => {
    const result = applyOndamFloor(-2)
    expect(result.effectiveCut).toBe(-2)
    expect(result.warning).toBeNull()
  })

  it('-5% → -4% (damped)', () => {
    const result = applyOndamFloor(-5)
    // excess = -5 - (-3) = -2, effective = -3 + (-2)*0.5 = -4
    expect(result.effectiveCut).toBeCloseTo(-4, 1)
    expect(result.warning).not.toBeNull()
    expect(result.warningLevel).toBe('yellow')
  })

  it('-8% → -5.5% (damped)', () => {
    const result = applyOndamFloor(-8)
    // excess = -8 - (-3) = -5, effective = -3 + (-5)*0.5 = -5.5
    expect(result.effectiveCut).toBeCloseTo(-5.5, 1)
    expect(result.warning).not.toBeNull()
    expect(result.warningLevel).toBe('red')
  })

  it('-10% → -6.5% (damped)', () => {
    const result = applyOndamFloor(-10)
    // excess = -10 - (-3) = -7, effective = -3 + (-7)*0.5 = -6.5
    expect(result.effectiveCut).toBeCloseTo(-6.5, 1)
    expect(result.warning).not.toBeNull()
  })

  it('hard floor clamps at -7%', () => {
    const result = applyOndamFloor(-20)
    // excess = -17, effective = -3 + (-17)*0.5 = -11.5, but clamped to -7
    expect(result.effectiveCut).toBe(-7)
  })

  it('zero produces no constraint', () => {
    const result = applyOndamFloor(0)
    expect(result.effectiveCut).toBe(0)
    expect(result.warning).toBeNull()
  })

  it('yellow warning for moderate cuts (-4% to -6%)', () => {
    const result = applyOndamFloor(-5)
    expect(result.warningLevel).toBe('yellow')
  })

  it('red warning for severe cuts (below -6%)', () => {
    const result = applyOndamFloor(-7)
    expect(result.warningLevel).toBe('red')
  })
})

describe('ONDAM floor in calculatePolicyImpact', () => {
  it('health spending -10% is damped to effective -6.5%', () => {
    const result = calculatePolicyImpact({ healthSpending: -10 })
    // effective = -6.5%, spending = -6.5 * 262.3 / 100 = -17.05
    expect(result.spendingChange).toBeCloseTo(-17.05, 0)
    expect(result.ondamWarning).not.toBeNull()
    expect(result.ondamEffectiveCut).toBeCloseTo(-6.5, 1)
  })

  it('health spending -3% is not damped', () => {
    const result = calculatePolicyImpact({ healthSpending: -3 })
    // -3 * 262.3 / 100 = -7.869
    expect(result.spendingChange).toBeCloseTo(-7.869, 1)
    expect(result.ondamWarning).toBeNull()
  })

  it('health spending +5% is not affected by floor', () => {
    const result = calculatePolicyImpact({ healthSpending: 5 })
    // 5 * 262.3 / 100 = 13.115
    expect(result.spendingChange).toBeCloseTo(13.115, 1)
    expect(result.ondamWarning).toBeNull()
  })
})

// =============================================================================
// PENSION REFORM PRESETS (COR scenarios)
// =============================================================================

describe('PENSION_REFORM_PRESETS', () => {
  it('has all 5 COR presets', () => {
    expect(Object.keys(PENSION_REFORM_PRESETS)).toHaveLength(5)
    expect(PENSION_REFORM_PRESETS).toHaveProperty('corOptimiste')
    expect(PENSION_REFORM_PRESETS).toHaveProperty('corCentral')
    expect(PENSION_REFORM_PRESETS).toHaveProperty('corPessimiste')
    expect(PENSION_REFORM_PRESETS).toHaveProperty('reformeRetraites')
    expect(PENSION_REFORM_PRESETS).toHaveProperty('reformeGlobale')
  })

  it('each preset has required structure', () => {
    for (const [, preset] of Object.entries(PENSION_REFORM_PRESETS)) {
      expect(preset).toHaveProperty('label')
      expect(preset).toHaveProperty('description')
      expect(preset).toHaveProperty('pensionReform')
      expect(preset.pensionReform).toHaveProperty('retirementAge')
      expect(preset.pensionReform).toHaveProperty('desindexation')
      expect(preset.pensionReform).toHaveProperty('pensionCap')
      expect(preset.pensionReform).toHaveProperty('notionnel')
    }
  })

  it('COR optimiste has 1.6% growth', () => {
    expect(PENSION_REFORM_PRESETS.corOptimiste.macroOverrides.realGrowth).toBe(0.016)
  })

  it('COR pessimiste has 0.7% growth', () => {
    expect(PENSION_REFORM_PRESETS.corPessimiste.macroOverrides.realGrowth).toBe(0.007)
  })

  it('COR central has no pension reform (statu quo)', () => {
    const pr = PENSION_REFORM_PRESETS.corCentral.pensionReform
    expect(pr.retirementAge).toBe(64)
    expect(pr.desindexation).toBe(0)
    expect(pr.pensionCap).toBe(0)
    expect(pr.notionnel).toBe(false)
  })

  it('reformeRetraites has full reform package', () => {
    const pr = PENSION_REFORM_PRESETS.reformeRetraites.pensionReform
    expect(pr.retirementAge).toBe(67)
    expect(pr.desindexation).toBe(1.5)
    expect(pr.pensionCap).toBe(15)
    expect(pr.notionnel).toBe(true)
  })

  it('reformeGlobale combines reform + growth', () => {
    const preset = PENSION_REFORM_PRESETS.reformeGlobale
    expect(preset.pensionReform.retirementAge).toBe(67)
    expect(preset.macroOverrides.realGrowth).toBe(0.016)
  })
})
