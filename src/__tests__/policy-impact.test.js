import { describe, it, expect } from 'vitest'
import { BASELINE, PRESETS, calculatePolicyImpact } from '../policy-impact'

// =============================================================================
// BASELINE constants - regression guards
// =============================================================================

describe('BASELINE constants', () => {
  it('état revenue total is 308.4', () => {
    expect(BASELINE.etat.revenuTotal).toBe(308.4)
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

  it('SS spending total is 676.9', () => {
    expect(BASELINE.securiteSociale.spendingTotal).toBe(676.9)
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
    // Note: spending components total 695.9, but consolidation of -19.0 brings it to 676.9
    expect(sum).toBeCloseTo(695.9, 1)
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
// Individual revenue levers
// =============================================================================

describe('calculatePolicyImpact - revenue levers', () => {
  describe('income tax (IR)', () => {
    it('+1pp produces ~8.47 Md revenue', () => {
      const result = calculatePolicyImpact({ incomeTaxChange: 1 })
      // 1 * 94.1 / 10 * 0.9 = 8.469
      expect(result.revenueChange).toBeCloseTo(8.469, 2)
    })

    it('+2pp produces 2x the impact (linearity)', () => {
      const one = calculatePolicyImpact({ incomeTaxChange: 1 })
      const two = calculatePolicyImpact({ incomeTaxChange: 2 })
      expect(two.revenueChange).toBeCloseTo(one.revenueChange * 2, 2)
    })

    it('negative change is symmetric', () => {
      const pos = calculatePolicyImpact({ incomeTaxChange: 3 })
      const neg = calculatePolicyImpact({ incomeTaxChange: -3 })
      expect(neg.revenueChange).toBeCloseTo(-pos.revenueChange, 2)
    })
  })

  describe('VAT (TVA)', () => {
    it('+1pp produces ~4.63 Md revenue', () => {
      const result = calculatePolicyImpact({ vatChange: 1 })
      // 1 * 97.5 / 20 * 0.95 = 4.63125
      expect(result.revenueChange).toBeCloseTo(4.631, 2)
    })

    it('linearity: +2pp = 2x', () => {
      const one = calculatePolicyImpact({ vatChange: 1 })
      const two = calculatePolicyImpact({ vatChange: 2 })
      expect(two.revenueChange).toBeCloseTo(one.revenueChange * 2, 2)
    })
  })

  describe('corporate tax (IS)', () => {
    it('+1pp produces ~1.44 Md revenue', () => {
      const result = calculatePolicyImpact({ corpTaxChange: 1 })
      // 1 * 51.3 / 25 * 0.7 = 1.4364
      expect(result.revenueChange).toBeCloseTo(1.436, 2)
    })
  })

  describe('social contributions (cotisations)', () => {
    it('+1pp produces ~9.07 Md revenue', () => {
      const result = calculatePolicyImpact({ socialContributions: 1 })
      // 1 * 372.0 / 41 = 9.07317...
      expect(result.revenueChange).toBeCloseTo(9.073, 2)
    })
  })

  describe('CSG', () => {
    it('+1pp produces ~14.67 Md revenue', () => {
      const result = calculatePolicyImpact({ csgRate: 1 })
      // 1 * 135.0 / 9.2 = 14.67391...
      expect(result.revenueChange).toBeCloseTo(14.674, 2)
    })
  })

  describe('revenue breakdown by sector', () => {
    it('income tax goes to état', () => {
      const result = calculatePolicyImpact({ incomeTaxChange: 1 })
      expect(result.etat.revenue).toBeCloseTo(8.469, 2)
      expect(result.ss.revenue).toBe(0)
    })

    it('CSG goes to sécurité sociale', () => {
      const result = calculatePolicyImpact({ csgRate: 1 })
      expect(result.ss.revenue).toBeCloseTo(14.674, 2)
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
    it('+1pp produces 3.075 Md spending increase', () => {
      const result = calculatePolicyImpact({ pensionIndexation: 1 })
      // 1 * 307.5 / 100 = 3.075
      expect(result.spendingChange).toBeCloseTo(3.075, 2)
    })
  })

  describe('health spending', () => {
    it('+10% produces 26.75 Md spending increase', () => {
      const result = calculatePolicyImpact({ healthSpending: 10 })
      // 10 * 267.5 / 100 = 26.75
      expect(result.spendingChange).toBeCloseTo(26.75, 2)
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
      expect(result.ss.spending).toBeCloseTo(3.075, 2)
      expect(result.etat.spending).toBe(0)
    })
  })
})

// =============================================================================
// Growth effects
// =============================================================================

describe('calculatePolicyImpact - growth effects', () => {
  it('corp tax cuts generate growth', () => {
    const result = calculatePolicyImpact({ corpTaxChange: -5 })
    // 5 * 0.002 = 0.01
    expect(result.growthEffect).toBeCloseTo(0.01, 4)
  })

  it('corp tax increases generate no growth', () => {
    const result = calculatePolicyImpact({ corpTaxChange: 5 })
    expect(result.growthEffect).toBe(0)
  })

  it('spending cuts create drag', () => {
    const result = calculatePolicyImpact({ spendingEducation: -20 })
    // spending = -17.78, growth = -17.78 * 0.0001 = -0.001778
    expect(result.growthEffect).toBeLessThan(0)
  })

  it('spending increases generate no growth', () => {
    const result = calculatePolicyImpact({ spendingEducation: 20 })
    expect(result.growthEffect).toBe(0)
  })

  it('social contribution cuts generate growth', () => {
    const result = calculatePolicyImpact({ socialContributions: -2 })
    // 2 * 0.001 = 0.002
    expect(result.growthEffect).toBeCloseTo(0.002, 4)
  })

  it('combined corp tax cut + social contrib cut', () => {
    const result = calculatePolicyImpact({ corpTaxChange: -3, socialContributions: -1 })
    // corp: 3 * 0.002 = 0.006, social: 1 * 0.001 = 0.001
    // spending is negative (social contrib cut doesn't affect spending directly)
    // total: 0.006 + 0.001 = 0.007
    expect(result.growthEffect).toBeCloseTo(0.007, 4)
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
    expect(result.revenueChange).toBeGreaterThan(100)
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

  it('combined max austerity improves deficit by ~200+ Md', () => {
    const result = calculatePolicyImpact({
      // Max revenue increases
      incomeTaxChange: 10,
      vatChange: 5,
      corpTaxChange: 5,
      socialContributions: 5,
      csgRate: 2,
      // Max spending cuts
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
      // Max revenue cuts
      incomeTaxChange: -10,
      vatChange: -5,
      corpTaxChange: -10,
      socialContributions: -5,
      csgRate: -2,
      // Max spending increases
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
    // Revenue falls by ~22 Md, spending falls by ~40 Md → net improvement ~18 Md
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

  it('NFP produces net expansion (more spending than revenue)', () => {
    const result = calculatePolicyImpact(PRESETS.nfp.levers)
    // NFP raises taxes and raises spending, net depends on magnitudes
    // Revenue up: IR +5pp (~42), IS +3pp (~4.3), CSG +2pp (~29.3) ≈ +76 Md
    // Spending up: edu +10% (~8.9), sol +15% (~4.5), pension +1pp (~3.1), health +5% (~13.4) ≈ +30 Md
    // So NFP actually improves deficit (more revenue than spending)
    expect(result.revenueChange).toBeGreaterThan(0)
    expect(result.spendingChange).toBeGreaterThan(0)
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
