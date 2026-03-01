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

### 1.5 `calculatePolicyImpact()` return value

```js
{
  revenueChange,   // Md€ — ETI-adjusted total revenue gain (État + SS)
  spendingChange,  // Md€ — total spending change (État + SS)
  growthEffect,    // pp nominal growth — tax drag + spending multipliers combined
  etat: { revenue, spending },
  ss:   { revenue, spending },
}
```

`growthEffect` feeds directly into the projection engine as a **permanent annual shift** to the nominal growth rate.

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

### 2.6 Year-by-year projection loop (`projectFiscalPath`)

For each year `t = 0, …, 10`:

1. **Growth rate:** `nominalGrowth = baseline (2.5%) + growthEffect + reformBoost(t)`
2. **Marginal interest rate:** `calculateInterestRate(debt/GDP, prevDeficitRatio)`
3. **Interest charge:** `interest = debt × avgPortfolioRate` (inertia)
4. **Update portfolio rate:** `avgPortfolioRate = avgPortfolioRate × 0.875 + marginalRate × 0.125`
5. **Primary deficit:** `primaryDeficit = baseline_primaryDeficit − deficitImprovement`
6. **Total deficit:** `totalDeficit = primaryDeficit + interest`
7. **Automatic stabilisers:** `growthFeedback = (nominalGrowth − 2.5%) × GDP × taxElasticity (0.45)`
8. **Adjusted deficit:** `adjustedDeficit = totalDeficit − growthFeedback`
9. **Unemployment:** Okun (see above)
10. **Store output:** {gdp, debt, deficit, debtRatio, deficitRatio, effectiveInterestRate, unemploymentRate, nominalGrowthRate, riskPremiumBps}
11. **Evolve state:** `prevDeficitRatio = |adjustedDeficit/gdp|`; `gdp × (1 + nominalGrowth)`; `debt + adjustedDeficit`

**Output fields:** The `effectiveInterestRate` reported to the UI is `avgPortfolioRate × 100` (the actual average cost of the debt stock, not the marginal rate). The `riskPremiumBps` field shows the marginal risk premium for transparency.

### 2.7 Doom-loop assessment (`assessDoomLoop`)

The `assessDoomLoop()` utility identifies whether the interest-rate feedback loop is active:

- **Active** if marginal risk premium increases > 20 bps over the projection period
- **Severity** = `interestRatio_change / |deficitRatio_final|`
  - High: > 30%; Medium: 15–30%; Low: < 15%

---

## Module 3 — User Interface (`src/App.jsx`)

### 3.1 Data flow

```
PRESETS[selected] → levers (slider state)
levers → calculatePolicyImpact() → { revenueChange, spendingChange, growthEffect }
policyImpact → projectFiscalPath() → scenarioProjection[0..10]
               getBaselineProjection() → baselineProjection[0..10]
scenarioProjection + baselineProjection → chartData[0..10]
```

The baseline is recomputed once on load; the scenario is recomputed on every slider change.

### 3.2 Charts

Four charts are displayed:

| Chart | Y-axis | Source field | Baseline shown |
|---|---|---|---|
| Dette publique / PIB | % | `debtRatio` | grey dashed |
| Déficit / PIB | % | `deficitRatio` | grey dashed |
| Croissance nominale | % | `nominalGrowthRate` | grey dashed |
| Chômage | % | `unemploymentRate` | grey dashed |

The primary debt/GDP chart is full-width; the three smaller charts sit in a grid below it.

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

181 tests across three files:

| File | Scope | Key assertions |
|---|---|---|
| `policy-impact.test.js` | Unit — revenue, spending, growth | ETI-adjusted revenue values; spending multiplier effects; NFP/GL regression tests |
| `projection-engine.test.js` | Unit — projection engine | Interest rate model; deficit stress premium; debt inertia; Okun Law; constants |
| `integration.test.js` | End-to-end — preset scenarios | Maximum stimulus; structural reforms; political risk; Knafo; maximum austerity |

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
| Base interest rate | 0.17% | AFT calibrated to 2.1% effective |
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
