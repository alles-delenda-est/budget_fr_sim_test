# Architecture & Model Documentation

## Overview

The Simulateur Budget France is a deterministic fiscal simulator that combines a static policy-impact layer with a dynamic multi-year projection engine. Users adjust tax rates and spending levels via sliders; the model translates those slider positions into revenue/spending changes, applies behavioural responses (ETI haircuts, fiscal multipliers), and then feeds the resulting fiscal aggregates into a year-by-year debt projection loop that includes endogenous interest rates, debt stock inertia, and Okun's Law unemployment.

```
User sliders (levers)
        │
        ▼
policy-impact.js          ← ETI behavioural response, fiscal multipliers
   calculatePolicyImpact()
        │
        │  { revenueChange, spendingChange, growthEffect }
        ▼
projection-engine-v1.8.js ← interest rate model, debt stock inertia,
   projectFiscalPath()       deficit stress premium, Okun unemployment
        │
        │  year-by-year array [{gdp, debt, deficit, interestRate, unemployment, …}]
        ▼
App.jsx                   ← charts, metric cards, presets, assumptions tab
```

---

## Module 1 — Policy Impact (`src/policy-impact.js`)

### 1.1 Baseline data

The `BASELINE` constant encodes the integrated PLF 2025 (État) and PLFSS 2026 (Sécurité Sociale) budgets:

| Pillar | Revenue (Md€) | Spending (Md€) | Deficit (Md€) |
|---|---|---|---|
| État | 315.3 | 445.0 | −129.7 |
| Sécurité Sociale | 659.4 | 686.6 | −17.5 |
| **Integrated** | **974.7** | **1 131.6** | **−147.2** |

État revenue breakdown: IR 94.1, TVA 97.5, IS 58.2, autres 65.5.
SS revenue breakdown: cotisations 372.0, CSG 135.0, impôts/taxes 117.0, compensations État 18.0, transferts 11.0, autres 6.4.
SS spending by branch: maladie 262.3, vieillesse 303.4, famille 59.4, AT-MP 18.0, autonomie 43.5.

### 1.2 Revenue sensitivity (static)

Each lever is converted to a raw static revenue estimate before behavioral adjustment:

| Tax | Formula | Rationale |
|---|---|---|
| IR (+1 pp) | `0.9 × IR_baseline / 10` | ~9% of baseline per 10 pp rate change |
| TVA (+1 pp) | `0.95 × TVA_baseline / 20` | ~4.75% of baseline per 20 pp rate change |
| IS (+1 pp) | `0.7 × IS_baseline / 25` | ~2.8% of baseline per 25 pp rate change |
| Cotisations (+1 pp) | `cotisations_baseline / 41` | scaled to current 41% total wedge |
| CSG (+1 pp) | `CSG_baseline / 9.2` | scaled to current 9.2% rate |

Spending levers are proportional: e.g., `spendingEducation × (education_baseline / 100)`.

### 1.3 Behavioral response (ETI calibration)

France is at or above the revenue-maximising rate on most taxes. A static (+10 Md€ → +10 Md€) assumption is therefore systematically wrong. The `BEHAVIORAL_RESPONSE` constant applies empirically-calibrated efficiency haircuts:

```
adjustedRevenue = rawRevenue × efficiency(lever)
```

where `efficiency` depends on direction:

| Tax | Increase efficiency | Decrease efficiency | Growth drag per +1 pp |
|---|---|---|---|
| IR | 0.70 | 1.05 | −0.0012 pp/yr |
| IS | 0.55 | 1.10 | −0.0025 pp/yr |
| TVA | 0.92 | 1.00 | −0.0004 pp/yr |
| CSG | 0.82 | 1.02 | −0.0008 pp/yr |
| Cotisations sociales | 0.58 | 1.08 | −0.0018 pp/yr |

**Calibration sources:**

- **IR (0.70):** ETI literature for France — top-10% ≈ 0.25, top-1% ≈ 0.55 (Kleven & Schultz 2014; Landais et al. 2011). Combined marginal rate ≈ 54%, putting France in the inelastic but non-trivial region.
- **IS (0.55):** High capital ETI plus profit-shifting elasticity. Zucman (2014) estimates France loses ~10% of corporate tax base to shifting; European Commission (2016) documents elasticity of ~0.50 for broad capital.
- **TVA (0.92):** Narrow substitution effect only (informal economy, cross-border shopping). Most robust tax in ETI literature. Keen & Lockwood (2010).
- **CSG (0.82):** Broad labour income base but non-trivial labour supply elasticity. Landais et al. (2011), DARES estimates.
- **Cotisations (0.58):** France has the highest employer social contribution wedge in the OECD (~31% employer + ~10% employee). At this saturation level, each additional point generates significant employment avoidance (undeclared work, automation, offshoring). OECD Employment Outlook (2019).
- **Growth drag:** Derived from emigration semi-elasticity for IR (Module 3 in calibration document: 0.17 per pp for top earners); capital reallocation for IS; consumption channel for TVA.

**Asymmetry:** Cuts receive a supply-side efficiency multiplier (> 1.00) reflecting investment attraction (IS), hiring incentives (cotisations), and consumption stimulus (IR, CSG).

### 1.4 Fiscal multipliers (spending)

Spending changes create GDP feedback in both directions. The `FISCAL_MULTIPLIERS` constant uses expansion-regime values as France's 2025 output gap is approximately zero:

| Category | Expansion multiplier | Recession multiplier |
|---|---|---|
| Education | 0.90 | 1.40 |
| Defense | 0.60 | 1.10 |
| Solidarity/transfers | 0.40 | 0.90 |
| Pensions/transfers | 0.40 | 0.90 |
| Health | 0.70 | 1.00 |

Growth effect per category: `spendingChange (Md€) / GDP_BASE × multiplier`

**Key design decisions:**
- Monetary offset is **zero**: France is a euro-area member; the ECB sets monetary policy for the whole zone and cannot offset country-level fiscal expansion through rate increases. (Blanchard & Leigh 2013 explicitly model this.)
- Multipliers apply **symmetrically** — spending cuts drag growth exactly as spending increases boost it (with the same magnitude). This is the main correction vs the previous model, which had near-zero drag from cuts.
- No automatic regime-switching: the simulator always uses expansion-regime multipliers. Recession-regime values are defined but not yet activated.

**Academic basis:** IMF WEO (2012) meta-analysis (Blanchard & Leigh), EC QUEST model (Coenen et al. 2012), Banque de France DGSE estimates, OECD cross-country panel.

### 1.5 ONDAM floor constraint

Health spending cuts face diminishing returns beyond −3% due to uncompressible demand (87% déserts médicaux, 52-day specialist waits, 20.8M emergency visits):

```
if requestedCut < -3%:
    effectiveCut = -3% + (requestedCut + 3%) × 0.50
    effectiveCut = max(effectiveCut, -7%)   // hard floor
```

Examples: −3% → −3% | −5% → −4% | −8% → −5.5% | −10% → −6.5% | −20% → −7% (clamped)

**Source:** DREES 2024, FNAIM healthcare access data.

**UI feedback:** Yellow warning for moderate cuts (−4% to −6%), red warning for severe cuts (below −6%).

### 1.6 `calculatePolicyImpact()` return value

```js
{
  revenueChange,      // Md€ — ETI-adjusted total revenue gain (État + SS)
  spendingChange,     // Md€ — total spending change (État + SS), ONDAM-adjusted
  growthEffect,       // pp nominal growth — tax drag + spending multipliers combined
  etat: { revenue, spending },
  ss:   { revenue, spending },
  ondamWarning,       // string|null — ONDAM floor warning message
  ondamWarningLevel,  // 'yellow'|'red'|null — warning severity
  ondamEffectiveCut,  // number — effective health spending cut after floor
}
```

`growthEffect` feeds directly into the projection engine as a **permanent annual shift** to the nominal growth rate.

### 1.7 COR scenario presets (`PENSION_REFORM_PRESETS`)

Five presets mapping Conseil d'Orientation des Retraites scenarios to pension reform parameters:

| Preset | Retirement age | Desindexation | Cap | Notionnel | Growth override |
|---|---|---|---|---|---|
| COR optimiste (1,6%) | 64 | 0 | 0 | No | 1.6% real |
| COR central (réf. 2024) | 64 | 0 | 0 | No | 1.0% real |
| COR pessimiste (réf. 2025) | 64 | 0 | 0 | No | 0.7% real |
| Réforme retraites | 67 | 1.5 | 15% | Yes | — |
| Réforme globale | 67 | 1.5 | 15% | Yes | 1.6% real |

**Source:** francetdb.com COR scenarios.

---

## Module 2 — Projection Engine (`src/projection-engine-v1.8.js`)

### 2.1 Macro baseline (2025)

| Parameter | Value | Source |
|---|---|---|
| GDP | 2 850 Md€ | INSEE national accounts |
| Debt | 3 300 Md€ | Agence France Trésor |
| Debt/GDP | 115.8% | AFT |
| Nominal growth | 2.5% | HCFP / PLF 2025 revised |
| Real growth | 0.7% | IMF Article IV 2025 |
| Inflation | 1.8% | ECB target |
| Primary deficit | 87.2 Md€ | PLF 2025 (deficit − interest) |
| Unemployment | 7.3% | INSEE |
| Tax elasticity to GDP | 0.45 | Standard OECD estimate |

### 2.2 Sovereign risk premium model

The marginal interest rate is computed by `calculateInterestRate(debtRatio, deficitRatio)` as a piecewise linear function:

```
Rate = baseRate + debtPremium + deficitPremium + politicalRisk
```

**Debt premium (piecewise linear, 4 regimes):**

| Regime | Debt/GDP | Slope |
|---|---|---|
| 1 — Low | < 60% | 0 bps/pp |
| 2 — Moderate | 60–90% | 3 bps/pp |
| 3 — High | 90–120% | 4 bps/pp |
| 4 — Crisis | > 120% | 10 bps/pp |

At France's baseline (115.8%): regime 3 → premium = (90−60)×3 + (115.8−90)×4 = 90 + 103.2 = 193.2 bps. Base rate 0.17% + premium 1.93% = 2.1% effective rate, matching the PLF 2025 charge de la dette of ~69 Md€ (3 300 × 0.021).

**Calibration:** IMF WP/17/87 (Kumar & Baldacci 2010), EC Fiscal Monitor (2018), France OAT 10-year spread history 2010–2025.

**Deficit stress premium:**

```
if deficit/GDP > 4%:
    deficitPremium = (deficit/GDP − 4%) × 17 bps
```

At France's 2025 deficit of ~5.17%: premium = 1.17 × 17 = ~20 bps. This reflects observed OAT–Bund spread widening that correlates with France's flow fiscal position independently of the debt stock.

**Constants:** `DEFICIT_STRESS_THRESHOLD = 4.0`, `DEFICIT_STRESS_SENSITIVITY = 0.0017`.

### 2.3 Debt stock inertia

France's OAT portfolio has an average maturity of ~8 years, so only ~12.5% of the debt stock matures each year. A sudden increase in marginal rates takes ~8 years to fully transmit to the average borrowing cost.

The engine maintains `avgPortfolioRate` as a state variable:

```
interest(t)       = debt(t) × avgPortfolioRate(t)    ← uses START-OF-YEAR rate
avgPortfolioRate(t+1) = avgPortfolioRate(t) × 0.875 + marginalRate(t) × 0.125
```

**Effect:** Rate shocks (e.g., a political risk premium spike) initially affect only 12.5% of the stock. The full effect accumulates geometrically — after 5 years, ~52% has passed through; after 8 years, ~66%; full pass-through asymptotically.

**Constant:** `ROLLOVER_RATE = 0.125`.

**Source:** Agence France Trésor maturity profile (AFT 2025).

### 2.4 Structural reform growth effects

Selected reforms (optional, currently used in presets) add a time-varying growth boost:

```
Year t boost = 0                               (t < lag)     — not yet active
             = growthEffect                    (lag ≤ t < lag+duration) — peak
             = growthEffect × 0.93^(t−peak)   (t ≥ lag+duration)       — decay
```

The 0.93 decay rate implies a ~10-year half-life post-peak (gradual return toward trend as the economy converges to the new steady state).

| Reform | Peak boost | Lag | Duration | Source |
|---|---|---|---|---|
| Labour market | +0.15 pp | 2 yr | 10 yr | IMF Article IV, OECD LMR |
| Product market regulation | +0.10 pp | 2 yr | 8 yr | Autorité de la concurrence |
| Planning/urbanisme | +0.15 pp | 3 yr | 15 yr | Hilber & Vermeulen (2016) |
| Education/formation | +0.08 pp | 5 yr | 20 yr | OECD Education at a Glance |
| Energy market | +0.12 pp | 2 yr | 10 yr | CRE, EC energy integration |
| Ambitious package | +0.40 pp | 2 yr | 12 yr | OECD (2014) comprehensive |
| Modest package | +0.20 pp | 2 yr | 10 yr | IMF baseline scenario |

### 2.5 Okun's Law unemployment

Each year, the deviation of actual real growth from the 2025 baseline (0.7%) is translated into unemployment via a standard Okun coefficient:

```
u(t) = u_baseline + okunCoefficient × (realGrowth_baseline − realGrowth(t))
     = 7.3% + 0.5 × (0.7% − realGrowth(t))
```

where `realGrowth(t) = nominalGrowth(t) − inflation (1.8%)`.

A scenario with +1 pp nominal growth gain → real growth +1 pp → unemployment −0.5 pp from baseline.

**Note:** This is a simple static Okun relationship applied each year independently. There is no hysteresis (unemployment does not affect potential growth). For the France calibration, coefficient 0.5 is consistent with OECD estimates and INSEE time-series regressions.

### 2.6 Demographic drift

Pension (303.4 Md€) and health (262.3 Md€) spending grow faster than GDP due to worsening dependency ratio (births −24% vs 2010, fertility 1.60, first negative natural balance since 1945).

```
demographicPressure(t) = t × 0.0048 × (303.4 × 0.80 + 262.3 × 0.50) = t × 1.795 Md/year
```

Year 10: ~17.9 Md€ additional spending. Year 20: ~35.9 Md€. Enabled by default (`enableDemographicDrift = true`).

**Source:** INSEE 2024 Projections de population, COR 2024 annual report.

**Validation:** COR projects ~1% GDP (~28.5 Md€) additional pension spending by 2035 at adverse scenario. Our 11.6 Md€ pension component at year 10 is conservative.

### 2.7 Senior employment → cotisations revenue

When labor market reform is active, senior employment rate increases (58% → 65% EU benchmark), generating cotisations revenue:

```
rateGain = min(reformMaturityYears × 0.005, 0.07)
additionalWorkers = 8.5M × rateGain
seniorRevenue = additionalWorkers × 14 350 EUR / 1e9  (Md€)
```

Year 10 (8 years maturity): ~4.9 Md€ additional revenue. Cap at 7 pp gain.

**Source:** DARES 2024, Eurostat senior employment, Hartz reform literature.

### 2.8 Pension reform engine (francetdb.com/#retraites)

Structural pension reforms are modeled as dynamic year-by-year adjustments to pension spending. Unlike the static `pensionIndexation` lever (short-term indexation policy), these reforms phase in over multiple years.

**Retirement age effect:**
```
ageAboveCurrent = targetAge − 64
rampFactor = min(t / 8, 1)        // 8-year phase-in
saving = 303.4 × ageAboveCurrent × 0.025 × rampFactor
```

Age 67 at year 10 (full ramp): 303.4 × 3 × 0.025 = 22.8 Md€.

**Desindexation (cumulative):**
```
annualReduction = desindexationPoints × 0.005
ramp = min(t / 3, 1)
saving = 303.4 × annualReduction × t × ramp
```

1.5 pt desindexation at year 10: 303.4 × 0.0075 × 10 = 22.8 Md€.

**Pension cap:** Direct % cut of pension mass with 3-year ramp-up.

**Notional accounts (Swedish NDC):** −6% of pension mass, 15-year ramp-up starting 2027.

**Pension floor:** Savings cannot reduce pension mass below 65% of baseline (maxSaving = 303.4 × 0.35 = 106.2 Md€).

**Source:** francetdb.com rtRunModel(), COR 2024.

### 2.9 Migration fiscal impact

Net migration creates a fiscal impact through the labor force channel. France experiences a "brain drain" — emigrants are more productive than immigrants on average.

```
immigrantWorkers = 270k × 0.57 × 0.75 = 115,425 effective workers/year
emigrantWorkers  = 200k × 0.88 × 1.10 = 193,600 effective workers/year
netWorkerChange  = −78,175 effective workers/year

migrationFiscalImpact(t) = t × −78,175 × 14,350 EUR / 1e9 = t × −1.12 Md€/year
```

Year 10: −11.2 Md€ fiscal impact. Year 25: −28.0 Md€. Enabled by default (`enableMigrationImpact = true`).

**Source:** francetdb.com RT_DEFAULT_HYP, INSEE immigration/emigration data 2023.

### 2.10 Dependance (autonomie) spending growth

Autonomie/dépendance spending (43.5 Md€ baseline) grows at 5.5%/year, significantly faster than GDP (2.5% nominal). This is separate from the demographic pension/health drift already modeled.

```
dependancePressure(t) = 43.5 × ((1.055)^t − (1.025)^t)
```

Year 10: ~18.6 Md€ additional spending. Year 25: ~84.8 Md€. Enabled by default (`enableDependanceDrift = true`).

**Source:** francetdb.com, DREES projections dépendance, PLFSS 2025.

### 2.11 Political risk premium (21 bps baseline)

The 2024 political crisis widened OAT-Bund 10Y spread by ~21 bps. This is now explicit in the interest rate decomposition:

- `baseInterestRate = −0.04%` (adjusted down from 0.17%)
- `politicalPremium = 0.21%` (21 bps)
- Net effect: effective rate unchanged at ~2.1%, but decomposition shows political component

The user's political risk slider adds **additional** premium beyond the already-priced 21 bps.

**Source:** Bloomberg OAT-Bund 10Y spread Q4 2024; ECB Financial Stability Review Nov 2024.

### 2.12 Year-by-year projection loop (`projectFiscalPath`)

For each year `t = 0, …, N`:

1. **Growth rate:** `nominalGrowth = baseline (2.5%) + growthEffect + reformBoost(t)`
2. **Marginal interest rate:** `calculateInterestRate(debt/GDP, prevDeficitRatio)` — includes 21 bps political premium
3. **Interest charge:** `interest = debt × avgPortfolioRate` (inertia)
4. **Update portfolio rate:** `avgPortfolioRate = avgPortfolioRate × 0.875 + marginalRate × 0.125`
5. **Primary deficit:** `primaryDeficit = baseline_primaryDeficit − deficitImprovement`
6. **Total deficit:** `totalDeficit = primaryDeficit + interest`
7. **Automatic stabilisers:** `growthFeedback = (nominalGrowth − 2.5%) × GDP × taxElasticity (0.45)`
8. **Demographic pressure:** `t × 1.795 Md/yr` (pension + health aging pressure)
9. **Senior employment revenue:** If labor reform active past lag: `additionalWorkers × avgCotisations`
10. **Pension reform savings:** Retirement age + desindexation + cap + notional accounts (dynamic, ramped)
11. **Migration fiscal impact:** `t × −1.12 Md/yr` (brain drain)
12. **Dependance pressure:** `43.5 × ((1.055)^t − (1.025)^t)` (autonomie excess growth)
13. **Adjusted deficit:** `totalDeficit − growthFeedback + demographicPressure − seniorRevenue − pensionReformSaving − migrationImpact + dependancePressure`
14. **Unemployment:** Okun (see above)
15. **Store output:** {gdp, debt, deficit, debtRatio, deficitRatio, effectiveInterestRate, unemploymentRate, nominalGrowthRate, riskPremiumBps, demographicPressure, seniorRevenue, pensionReformSaving, migrationImpact, dependancePressure}
16. **Evolve state:** `prevDeficitRatio = |adjustedDeficit/gdp|`; `gdp × (1 + nominalGrowth)`; `debt + adjustedDeficit`

**Output fields:** The `effectiveInterestRate` reported to the UI is `avgPortfolioRate × 100` (the actual average cost of the debt stock, not the marginal rate). The `riskPremiumBps` field shows the marginal risk premium for transparency (now includes 21 bps political component).

### 2.13 Doom-loop assessment (`assessDoomLoop`)

The `assessDoomLoop()` utility identifies whether the interest-rate feedback loop is active:

- **Active** if marginal risk premium increases > 20 bps over the projection period
- **Severity** = `interestRatio_change / |deficitRatio_final|`
  - High: > 30%; Medium: 15–30%; Low: < 15%

---

## Module 3 — User Interface (`src/App.jsx`)

### 3.1 Data flow

```
PRESETS[selected] → levers (slider state)
levers → calculatePolicyImpact() → { revenueChange, spendingChange, growthEffect, ondamWarning }
policyImpact → projectFiscalPath() → scenarioProjection[0..N]
               getBaselineProjection() → baselineProjection[0..N]
scenarioProjection + baselineProjection → chartData[0..N]
```

The baseline is recomputed once on load; the scenario is recomputed on every slider change.

### 3.2 Charts

Five charts are displayed:

| Chart | Y-axis | Source field | Baseline shown |
|---|---|---|---|
| Dette publique / PIB | % | `debtRatio` | grey dashed |
| Déficit / PIB | % | `deficitRatio` | grey dashed |
| Croissance nominale | % | `nominalGrowthRate` | grey dashed |
| Chômage | % | `unemploymentRate` | grey dashed |
| Cotisants/retraité | ratio | `cotisantsPerRetraite` | — |

The primary debt/GDP chart is full-width; the four smaller charts sit in a grid below it.

### 3.3 Metric snapshots

Three time horizons are displayed: Year 1 (immediate), Year 5 (medium term), Year 10 (long term). For each horizon, three metrics are shown: debt level (Md€), deficit (Md€), and interest charge (Md€). Colour coding reflects direction vs baseline (green = improvement, red = deterioration).

### 3.4 Political presets

| Preset | Revenue Δ (static) | Revenue Δ (ETI-adjusted) | Growth effect |
|---|---|---|---|
| PLF 2025 (Barnier) | ~+9 Md | ~+7 Md | ~0 |
| Génération Libre | −20 Md | −17 Md | +0.014 pp/yr |
| Knafo (RN/Reconquête) | −14 Md | −12 Md | −0.011 pp/yr (multiplier drag) |
| Nouveau Front Populaire | +77 Md | ~+53 Md | −0.011 pp/yr |

The NFP preset demonstrates the ETI correction most clearly: a static analysis suggests 77 Md€ of additional revenue; the ETI-adjusted estimate is ~53 Md€. Combined with a small growth drag from tax increases (feeding through automatic stabilisers), the 10-year debt path deteriorates relative to the static projection.

Knafo's large spending cuts create a negative multiplier growth effect large enough to worsen debt/GDP vs baseline despite the primary balance improvement — an explicit illustration of the fiscal multiplier mechanism.

### 3.5 Assumptions tab

The UI includes a dedicated Assumptions tab listing all model parameters with academic sources. The `BEHAVIORAL_RESPONSE` and `FISCAL_MULTIPLIERS` constants are exposed in two tables, making the calibration transparent and auditable.

---

## Module 4 — Test Suite (`src/__tests__/`)

~282 tests across three files:

| File | Tests | Scope | Key assertions |
|---|---|---|---|
| `projection-engine.test.js` | ~158 | Unit — projection engine | Interest rate model; deficit stress; debt inertia; Okun Law; demographic drift; senior employment; energy/planning constants; pension reform (age, desindexation, cap, notional, floor); migration; dependance |
| `policy-impact.test.js` | ~87 | Unit — revenue, spending, growth | ETI-adjusted revenue; spending multipliers; ONDAM floor constraint; NFP/GL regression; COR presets |
| `integration.test.js` | ~37 | End-to-end — preset scenarios | Maximum stimulus; structural reforms; political risk; demographic drift integration; ONDAM integration; COR scenarios; pension reform + demographic interaction; migration/dependance validation |

---

## Known Model Limitations

1. **No collectivités locales or other APU sub-sectors.** The integrated budget covers État + ASSO only (~89% of APU total spending).
2. **Deterministic.** No Monte Carlo, no uncertainty bands. All parameters are point estimates.
3. **Single-regime multipliers.** Expansion-regime fiscal multipliers are used throughout. The engine does not automatically switch to recession-regime multipliers when the output gap turns negative.
4. **Instantaneous policy implementation.** All lever changes are assumed to take effect in Year 1. No phase-in of tax reforms or spending changes.
5. **Static Okun relationship.** Unemployment tracks growth deviations each year independently with no hysteresis. Persistent unemployment does not feed back into potential growth.
6. **Cross-country reform estimates.** Structural reform growth effects are calibrated from OECD cross-country panels. Country-specific uncertainty for France is high.
7. **No inflation model.** Inflation is held fixed at 1.8% (ECB target). Demand shocks do not affect inflation, and the real/nominal growth split does not endogenously respond to policy.
8. **No financial sector contagion.** The doom-loop detection is heuristic; no bank-sovereign feedback is modelled.
9. **Linear demographic drift.** Dependency ratio grows linearly at +0.48 pp/yr; actual demographic trajectory may accelerate or decelerate depending on immigration and fertility trends.
10. **Senior employment cap.** Employment rate capped at EU benchmark (65%); no skill-mismatch friction or sectoral absorption capacity modeled.
11. **ONDAM floor simplification.** Damping factor is constant at 50%; real-world diminishing returns may vary by healthcare sub-sector.
12. **Political premium static.** The 21 bps baseline is a Q4 2024 point estimate; actual OAT-Bund spread fluctuates daily.

---

## Parameter Summary

| Parameter | Value | Source |
|---|---|---|
| GDP 2025 | 2 850 Md€ | INSEE |
| Debt 2025 | 3 300 Md€ | AFT |
| Nominal growth (baseline) | 2.5% | HCFP / PLF 2025 |
| Real growth (baseline) | 0.7% | IMF Article IV 2025 |
| Inflation | 1.8% | ECB target |
| Primary deficit | 87.2 Md€ | PLF 2025 |
| Base interest rate | −0.04% | AFT calibrated; political premium separate |
| Political premium (baseline) | 21 bps | Bloomberg OAT-Bund Q4 2024; ECB FSR Nov 2024 |
| Risk premium slope 1 (60–90%) | 3 bps/pp | IMF/EC consensus |
| Risk premium slope 2 (90–120%) | 4 bps/pp | France historical |
| Risk premium slope 3 (>120%) | 10 bps/pp | Crisis risk estimate |
| Deficit stress threshold | 4% GDP | Module 1 calibration |
| Deficit stress sensitivity | 17 bps/% | Module 1 calibration |
| OAT rollover rate | 12.5%/yr | AFT maturity profile (avg ~8 yr) |
| Tax elasticity to GDP | 0.45 | OECD standard |
| Unemployment 2025 | 7.3% | INSEE |
| Okun coefficient | 0.5 | Standard France estimate |
| IR behavioral efficiency (↑) | 0.70 | Kleven & Schultz 2014; Landais 2011 |
| IS behavioral efficiency (↑) | 0.55 | EC 2016; Zucman 2014 |
| TVA behavioral efficiency (↑) | 0.92 | Keen & Lockwood 2010 |
| CSG behavioral efficiency (↑) | 0.82 | Landais 2011; DARES |
| Cotisations behavioral efficiency (↑) | 0.58 | OECD Employment Outlook 2019 |
| Education multiplier (expansion) | 0.90 | Blanchard & Leigh 2013; Coenen et al. |
| Defense multiplier (expansion) | 0.60 | IMF WEO 2012 meta-analysis |
| Transfers multiplier (expansion) | 0.40 | IMF WEO 2012; BdF DGSE |
| Health multiplier (expansion) | 0.70 | OECD cross-country panel |
| Dependency ratio drift | +0.48 pp/yr | INSEE 2024 Projections de population |
| Pension elasticity to dependency | 0.80 | COR 2024 annual report |
| Health elasticity to dependency | 0.50 | DREES 2024 |
| Demographic pressure per year | ~1.8 Md€/yr | Computed: 0.0048 × (303.4×0.80 + 262.3×0.50) |
| Senior employment rate (current) | 58% | DARES 2024 |
| Senior employment benchmark | 65% | Eurostat EU average |
| Senior employment gain per reform year | +0.5 pp/yr | Hartz reform literature (conservative) |
| Avg cotisations per senior worker | 14 350 EUR | DARES 2024 |
| ONDAM floor threshold | −3% | DREES 2024 |
| ONDAM damping factor | 50% | Estimated from healthcare constraint data |
| ONDAM hard floor | −7% | Safety bound |
| Energy reform growth effect | +0.07 pp/yr | CRE 2024, Eurostat (reduced: France already competitive) |
| Planning reform growth effect | +0.20 pp/yr | FNAIM 2024, Hilber & Vermeulen (uplifted: France tension) |
| Pension mass (vieillesse) | 303.4 Md€ | PLFSS 2025, francetdb.com |
| Cotisants/retraité | 1.70 | COR 2024 |
| Ratio decline per year | −0.012 | COR 2024 |
| Retirement age pension mass effect | −2.5%/yr above 64 | francetdb.com rtRunModel() |
| Retirement age ramp-up | 8 years | francetdb.com |
| Desindexation revalo reduction | 0.5 pt per point | francetdb.com |
| Notional accounts reduction | −6% pension mass | francetdb.com, NDC model |
| Notional accounts ramp-up | 15 years from 2027 | francetdb.com |
| Pension floor | 65% of baseline | Political constraint |
| Immigration flow | 270k/yr | INSEE 2023 |
| Immigration employment rate | 57% | INSEE 2023 |
| Immigration productivity factor | 0.75 | francetdb.com |
| Emigration flow | 200k/yr | INSEE 2023 |
| Emigration employment rate | 88% | INSEE 2023 |
| Emigration productivity factor | 1.10 | francetdb.com |
| Net migration fiscal impact | −1.12 Md€/yr | Computed |
| Dependance baseline | 43.5 Md€ | PLFSS 2025 branche autonomie |
| Dependance annual growth | 5.5%/yr | francetdb.com, DREES |
