import { describe, it, expect } from 'vitest'
import { calculatePolicyImpact, BASELINE, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from '../policy-impact'
import { projectFiscalPath, calculateInterestRate, getBaselineProjection } from '../projection-engine-v1.8'

// =============================================================================
// AGENT 2: REVENUE MECHANICS & BEHAVIORAL RESPONSE
// =============================================================================

describe('Revenue Levers Behavioral Response', () => {
  const revenueLevers = [
    { name: 'incomeTaxChange', lever: 'incomeTax', base: BASELINE.etat.incomeTax, rate: 10, adjustment: 0.9 },
    { name: 'vatChange', lever: 'vat', base: BASELINE.etat.vat, rate: 20, adjustment: 0.95 },
    { name: 'corpTaxChange', lever: 'corporateTax', base: BASELINE.etat.corporateTax, rate: 25, adjustment: 0.7 },
    { name: 'socialContributions', lever: 'socialContributions', base: BASELINE.securiteSociale.cotisations, rate: 41, adjustment: 1.0 },
    { name: 'csgRate', lever: 'csg', base: BASELINE.securiteSociale.csg, rate: 9.2, adjustment: 1.0 },
  ];

  revenueLevers.forEach(({ name, lever, base, rate, adjustment }) => {
    describe(`${lever}`, () => {
      const response = BEHAVIORAL_RESPONSE[lever];

      it('increase is haircut by increaseEfficiency', () => {
        const staticRevenue = 1 * base / rate * adjustment;
        const result = calculatePolicyImpact({ [name]: 1 });
        expect(result.revenueChange).toBeCloseTo(staticRevenue * response.increaseEfficiency);
      });

      it('decrease is boosted by decreaseEfficiency', () => {
        const staticRevenue = -1 * base / rate * adjustment;
        const result = calculatePolicyImpact({ [name]: -1 });
        expect(result.revenueChange).toBeCloseTo(staticRevenue * response.decreaseEfficiency);
      });

      it('increase creates a negative growth drag', () => {
        const result = calculatePolicyImpact({ [name]: 1 });
        expect(result.growthEffect).toBeCloseTo(response.growthDragPerPp * 1);
        expect(result.growthEffect).toBeLessThanOrEqual(0);
      });

      it('decrease creates positive growth boost', () => {
        const result = calculatePolicyImpact({ [name]: -1 });
        // Tax cuts now produce a growth boost via growthBoostPerPp
        expect(result.growthEffect).toBeCloseTo(response.growthBoostPerPp * 1);
        expect(result.growthEffect).toBeGreaterThanOrEqual(0);
      });
    });
  });
});

// =============================================================================
// AGENT 3: EXPENDITURE MECHANICS & FISCAL MULTIPLIERS
// =============================================================================

describe('Expenditure Levers & Fiscal Multipliers', () => {
  const spendingLevers = [
    { name: 'spendingEducation', lever: 'education', base: BASELINE.etat.education },
    { name: 'spendingSolidarity', lever: 'solidarity', base: BASELINE.etat.solidarity },
    { name: 'healthSpending', lever: 'health', base: BASELINE.securiteSociale.maladie },
  ];

  const GDP_BASE = 2850;

  spendingLevers.forEach(({ name, lever, base }) => {
    describe(`${lever}`, () => {
      const multiplier = FISCAL_MULTIPLIERS[lever]?.expansion;

      it('calculates spending change correctly', () => {
        const result = calculatePolicyImpact({ [name]: 10 }); // +10%
        const expectedChange = base * 0.10;
        expect(result.spendingChange).toBeCloseTo(expectedChange);

        const resultNeg = calculatePolicyImpact({ [name]: -10 }); // -10%
        const expectedChangeNeg = base * -0.10;
        // Health spending has a floor, so we need to account for that
        if (name === 'healthSpending') {
            expect(resultNeg.spendingChange).toBeLessThan(0)
            expect(resultNeg.ondamWarning).not.toBeNull()
        } else {
            expect(resultNeg.spendingChange).toBeCloseTo(expectedChangeNeg);
        }
      });

      if (multiplier) {
        it('applies the correct fiscal multiplier to growth', () => {
          const result = calculatePolicyImpact({ [name]: 10 });
          const spendingAmount = base * 0.10;
          const expectedGrowthEffect = (spendingAmount / GDP_BASE) * multiplier;
          expect(result.growthEffect).toBeCloseTo(expectedGrowthEffect);
        });

        it('applies a negative multiplier for spending cuts', () => {
            const result = calculatePolicyImpact({ [name]: -10 });
            const spendingAmount = result.spendingChange; // Use the actual change (post-ONDAM floor for health)
            const expectedGrowthEffect = (spendingAmount / GDP_BASE) * multiplier;
            expect(result.growthEffect).toBeCloseTo(expectedGrowthEffect);
            expect(result.growthEffect).toBeLessThanOrEqual(0);
        });
      }
    });
  });
});

// =============================================================================
// AGENT 4: PROJECTION & RISK ENGINE
// =============================================================================

describe('Projection & Risk Engine', () => {
    it('politicalRiskPremium increases the final debt/GDP ratio', () => {
        const baseline = getBaselineProjection(10);
        const riskyScenario = projectFiscalPath({}, { years: 10, politicalRiskPremium: 0.01 }); // 100 bps

        expect(riskyScenario[10].debtRatio).toBeGreaterThan(baseline[10].debtRatio);
    });

    it('politicalRiskPremium is reflected in the effective interest rate', () => {
        const baseline = getBaselineProjection(5);
        const riskyScenario = projectFiscalPath({}, { years: 5, politicalRiskPremium: 0.01 }); // 100 bps

        const baselineAvgRate = baseline.reduce((sum, y) => sum + y.effectiveInterestRate, 0) / baseline.length;
        const riskyAvgRate = riskyScenario.reduce((sum, y) => sum + y.effectiveInterestRate, 0) / riskyScenario.length;

        // The average rate should be higher by approximately 100 bps (1%)
        expect(riskyAvgRate).toBeGreaterThan(baselineAvgRate);
        expect(riskyAvgRate).toBeCloseTo(baselineAvgRate + 1.0, 0.2); // Allow tolerance for compounding effects
    });

    it('Projection horizon parameter correctly sets the output length', () => {
        const projection5 = projectFiscalPath({}, { years: 5 });
        const projection20 = projectFiscalPath({}, { years: 20 });

        expect(projection5).toHaveLength(6); // years + 1 for year 0
        expect(projection20).toHaveLength(21);
    });
});
