# Simulateur Budget France — Maintenance Agent Specification

## Agent Identity

You are the **architecture and algorithms update agent** for the Simulateur Budget France. Your role is to maintain this simulator at best-in-class quality by keeping parameters current, validating against academic sources, and ensuring robustness across all projection scenarios.

---

## Architecture Map

### Source Files

| File | Role | Key exports |
|---|---|---|
| `src/policy-impact.js` | Static policy layer — converts slider positions to fiscal impacts | `calculatePolicyImpact()`, `BASELINE`, `PRESETS`, `PENSION_REFORM_PRESETS`, `BEHAVIORAL_RESPONSE`, `FISCAL_MULTIPLIERS`, `ONDAM_FLOOR`, `applyOndamFloor()` |
| `src/projection-engine-v1.8.js` | Dynamic projection engine — multi-year fiscal trajectory | `projectFiscalPath()`, `calculateInterestRate()`, `MACRO_BASELINE`, `STRUCTURAL_REFORMS`, `DEMOGRAPHIC_PARAMS`, `SENIOR_EMPLOYMENT`, `PENSION_REFORM`, `MIGRATION_PARAMS`, `DEPENDANCE_PARAMS` |
| `src/App.jsx` | React UI — charts, sliders, presets, assumptions tab | `App` component, `ASSUMPTIONS` data |

### Data Flow

```
User sliders (levers)
        │
        ▼
policy-impact.js
   calculatePolicyImpact()  ← ETI behavioral response, fiscal multipliers, ONDAM floor
        │
        │  { revenueChange, spendingChange, growthEffect, ondamWarning }
        ▼
projection-engine-v1.8.js
   projectFiscalPath()      ← interest rate model, debt inertia, demographic drift,
        │                      senior employment, deficit stress, Okun unemployment,
        │                      pension reform, migration, dependance
        │
        │  year-by-year array [{gdp, debt, deficit, interestRate, unemployment,
        │                       demographicPressure, seniorRevenue, pensionReformSaving,
        │                       migrationImpact, dependancePressure, …}]
        ▼
App.jsx                     ← charts, metric cards, presets, assumptions tab
```

### Projection Loop Steps (16-step)

For each year `t = 0, …, N`:

1. **Growth rate:** `nominalGrowth = baseline (2.5%) + growthEffect + reformBoost(t)`
2. **Marginal interest rate:** `calculateInterestRate(debt/GDP, prevDeficitRatio)` — includes political premium (21 bps)
3. **Interest charge:** `interest = debt × avgPortfolioRate` (inertia)
4. **Update portfolio rate:** `avgPortfolioRate = avgPortfolioRate × 0.875 + marginalRate × 0.125`
5. **Primary deficit:** `primaryDeficit = baseline_primaryDeficit − deficitImprovement`
6. **Total deficit:** `totalDeficit = primaryDeficit + interest`
7. **Automatic stabilisers:** `growthFeedback = (nominalGrowth − 2.5%) × GDP × 0.45`
8. **Demographic pressure:** `t × 1.795 Md/yr` (pension + health spending growth from aging)
9. **Senior employment revenue:** If labor reform active and past lag: `additionalWorkers × avgCotisations`
10. **Pension reform savings:** Retirement age + desindexation + cap + notional accounts (dynamic, ramped, floor-constrained)
11. **Migration fiscal impact:** `t × −1.12 Md/yr` (brain drain — negative revenue from net emigration)
12. **Dependance pressure:** `43.5 × ((1.055)^t − (1.025)^t)` (autonomie excess growth over GDP)
13. **Adjusted deficit:** `totalDeficit − growthFeedback + demographicPressure − seniorRevenue − pensionReformSaving − migrationImpact + dependancePressure`
14. **Unemployment:** Okun's Law
15. **Store output:** Including pensionReformSaving, migrationImpact, dependancePressure
16. **Evolve state:** Update GDP, debt, deficit ratio

---

## Module System

### Module 1: Policy Impact (`src/policy-impact.js`)

- **BASELINE:** PLF 2025 (État) + PLFSS 2026 (Sécurité Sociale) integrated budget
- **BEHAVIORAL_RESPONSE:** ETI-calibrated tax efficiency haircuts (5 tax types)
- **FISCAL_MULTIPLIERS:** Spending growth effects (5 categories, expansion/recession)
- **ONDAM_FLOOR:** Health spending cut constraint (-3% threshold, 50% damping, -7% hard floor)
- **PRESETS:** 4 political scenarios (PLF2025, Génération Libre, Knafo, NFP)
- **PENSION_REFORM_PRESETS:** 5 COR scenarios (optimiste, central, pessimiste, réforme retraites, réforme globale)

### Module 2: Projection Engine (`src/projection-engine-v1.8.js`)

- **MACRO_BASELINE:** GDP 2850, debt 3300, growth 2.5%, unemployment 7.3%
- **Interest rate model:** 4-regime piecewise linear + deficit stress + political premium (21 bps)
- **Debt inertia:** 12.5% annual rollover, ~8 year full pass-through
- **DEMOGRAPHIC_PARAMS:** Dependency ratio drift +0.48 pp/yr → ~1.8 Md/yr additional spending
- **SENIOR_EMPLOYMENT:** Reform-contingent cotisations revenue (58% → 65% senior employment)
- **STRUCTURAL_REFORMS:** 7 reform packages with lag/duration/decay
- **PENSION_REFORM:** Retirement age, desindexation, cap, notional accounts, noria effect, pension floor
- **MIGRATION_PARAMS:** Immigration/emigration flows, employment rates, productivity factors
- **DEPENDANCE_PARAMS:** Autonomie spending baseline and excess growth rate

### Module 3: UI (`src/App.jsx`)

- 5 charts (debt/GDP, deficit/GDP, growth, unemployment, cotisants/retraité)
- 3 time horizon snapshots (Year 1, 5, 10) with sustainability metrics at Year 10
- ONDAM warning display (yellow/red)
- 4 pension reform sliders (age, desindexation, cap, notionnel toggle)
- 5 COR preset buttons
- Political risk slider (additional premium beyond 21 bps baseline)
- Assumptions tab with all parameters and academic sources

### Module 4: Tests (`src/__tests__/`)

- `projection-engine.test.js` — ~158 tests (constants, interest rate, projection, demographic, senior employment, pension reform, migration, dependance)
- `policy-impact.test.js` — ~87 tests (revenue, spending, growth, ONDAM floor, COR presets)
- `integration.test.js` — ~37 tests (presets end-to-end, stress tests, demographic integration, COR scenarios, pension reform interaction)
- Total: ~282 tests

---

## Parameter Update Calendar

| Parameter Category | Source | Update Timing | Files Affected |
|---|---|---|---|
| GDP, growth, inflation | INSEE Comptes nationaux, BdF projections | **March** (annual) | `projection-engine`: MACRO_BASELINE |
| Debt stock, interest rates | Agence France Trésor (AFT) | **January** (annual) | `projection-engine`: MACRO_BASELINE, ROLLOVER_RATE |
| Budget data (PLF/PLFSS) | PLF (October), PLFSS (October) | **October** (annual) | `policy-impact`: BASELINE |
| Demographics | INSEE Bilan démographique | **January** (annual) | `projection-engine`: DEMOGRAPHIC_PARAMS |
| Political premium | Bloomberg OAT-Bund spread | **Continuous** (market data) | `projection-engine`: riskPremium.politicalPremium |
| Behavioral parameters | Academic literature (ETI, multipliers) | **Ad hoc** (publication-driven) | `policy-impact`: BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS |
| Unemployment | INSEE, DARES | **Quarterly** | `projection-engine`: MACRO_BASELINE.unemploymentRate |
| Senior employment | DARES, Eurostat | **Annual** | `projection-engine`: SENIOR_EMPLOYMENT |
| ONDAM constraints | DREES, FNAIM | **Annual** | `policy-impact`: ONDAM_FLOOR |
| Pension reform params | COR annual report, francetdb | **Annual** | `projection-engine`: PENSION_REFORM |
| Migration flows | INSEE Bilan migratoire | **Annual** | `projection-engine`: MIGRATION_PARAMS |
| Dependance spending | PLFSS, DREES | **October** (annual) | `projection-engine`: DEPENDANCE_PARAMS |

---

## Update Procedure

1. **Branch:** Create a feature branch (`update/[category]-[year]`)
2. **Update constants:** Modify the relevant `MACRO_BASELINE`, `BASELINE`, or parameter constants
3. **Update tests:** Adjust regression guards for changed constants; verify all assertions
4. **Run suite:** `npx vitest run` — all tests must pass
5. **Update docs:** Update `ARCHITECTURE.md` parameter summary and any changed values
6. **Verify UI:** `npm run dev` — load app, verify baseline figures, test sliders at extremes
7. **Commit:** Clear commit message referencing source data and date

---

## Academic Validation Checklist

When adding or modifying any model parameter:

- [ ] **Source requirement:** Parameter must have a citable academic, institutional, or official statistical source
- [ ] **Range validation:** Value must fall within the range reported in the literature (±1 standard deviation where available)
- [ ] **Confidence level:** Assign one of: `high` (multiple converging sources), `medium` (single credible source), `low` (extrapolated or uncertain)
- [ ] **Documentation:** Add source reference in code comment AND in ARCHITECTURE.md parameter summary
- [ ] **Cross-validation:** Where possible, verify against an independent source or methodology

---

## Test Patterns

### Regression Guards for Constants

```js
it('has correct GDP', () => {
  expect(MACRO_BASELINE.gdp).toBe(2850)
})
```

Every exported constant that enters calculations must have a `toBe()` guard. This prevents accidental changes from propagating silently.

### Numeric Precision

```js
expect(result).toBeCloseTo(expectedValue, decimalPlaces)
```

Use `toBeCloseTo` for all computed values. Decimal places:
- 0 for Md€ amounts (rounding to 1 decimal in output)
- 1 for ratios (%)
- 4 for rates (decimal form)
- 6 for constants

### Integration Tests for Behavioral Impact

Test that model changes produce directionally correct results:
- Austerity → lower deficit, higher unemployment
- Stimulus → higher deficit, lower unemployment
- Reform → higher growth, lower debt/GDP (after lag)
- Demographic drift → higher deficit over time
- ONDAM floor → damped health spending cuts
- Pension reform → reduced pension spending, pension floor prevents extreme cuts
- Migration → worsened deficit from brain drain
- Dependance → additional spending pressure over time
- COR presets → valid projections with correct reform parameters

---

## Security Review Process (HARD GATE)

**MANDATORY: No production deployment proceeds without Gemini security review sign-off.**

### Review Scope

1. **Security-by-design:** No injection vulnerabilities, proper input validation at system boundaries
2. **Coding excellence:** Clean code, no dead code, consistent patterns, proper error handling
3. **Robustness:** Edge cases handled (NaN, undefined, extreme slider values, 20-year projections)

### Process

1. Before any deployment to production, request a Gemini review of all changed files
2. Gemini must confirm: "APPROVED for production deployment"
3. If Gemini flags issues, fix them and re-request review
4. **No exceptions.** Preview deploys are allowed without review; production deploys are not.

### Review Checklist

- [ ] All `calculateInterestRate()` edge cases produce valid numbers (no NaN, no Infinity)
- [ ] All slider extreme combinations produce valid projections
- [ ] No hardcoded credentials or API keys
- [ ] No eval(), innerHTML, or other injection vectors
- [ ] All external data (user inputs) are sanitized before use in calculations

---

## Deployment Workflow

### Platform: Vercel

| Command | Purpose |
|---|---|
| `npm run dev` | Local development server |
| `npm run build` | Production build (`vite build`) |
| `npm run preview` | Preview production build locally |
| `npx vitest run` | Run test suite |

### Deployment Steps

1. **Development:** Work on feature branch, run tests locally
2. **Preview deploy:** Push branch → Vercel creates preview deploy automatically
3. **Gemini review:** Request security review (HARD GATE — see above)
4. **Production deploy:** Only after Gemini sign-off, merge to main → Vercel deploys to production

### Pre-deployment Checklist

- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — no build errors
- [ ] Manual verification: load app, check baseline figures, test slider extremes
- [ ] No NaN in any chart or metric card
- [ ] All presets load correctly
- [ ] Assumptions tab displays all parameters with sources
- [ ] Gemini security review: APPROVED

---

## Known Limitations

1. **No collectivités locales** — Budget covers État + ASSO only (~89% APU spending)
2. **Deterministic** — No Monte Carlo, no uncertainty bands
3. **Single-regime multipliers** — Always uses expansion-regime; no automatic recession switch
4. **Instantaneous policy** — Lever changes take effect in Year 1 (no phase-in)
5. **Static Okun** — No unemployment hysteresis or feedback to potential growth
6. **Cross-country reform estimates** — Structural reform effects extrapolated from OECD panels
7. **No inflation model** — Inflation fixed at 1.8%; no endogenous price response
8. **No financial contagion** — Doom loop is heuristic; no bank-sovereign feedback
9. **Linear demographic drift** — Dependency ratio grows linearly; actual path may accelerate
10. **Senior employment cap** — Employment rate capped at EU benchmark (65%); no skill-mismatch friction modeled
11. **ONDAM floor simplification** — Damping factor is constant; real-world political constraints may vary
12. **Political premium static** — 21 bps baseline is a point estimate; actual spread fluctuates daily
