/**
 * FRENCH BUDGET SIMULATOR - PROJECTION ENGINE v1.8
 *
 * New features:
 * - Enhanced sovereign risk premium model (France-calibrated)
 * - Structural reform growth effects
 * - Debt stock inertia (avg portfolio rate, 12.5% annual rollover)
 * - Deficit-sensitive interest rate premium (stress regime)
 * - Unemployment via Okun's Law
 *
 * Academic sources:
 * - Interest rates: IMF (2017), EC (2018), Kumar & Baldacci (2010)
 * - Structural reforms: OECD (2014), IMF Article IV France (2025)
 * - Debt inertia: OAT maturity profile (AFT 2025), Module 1
 * - Okun's Law: INSEE, standard France coefficient
 */

// =============================================================================
// BASELINE PARAMETERS
// =============================================================================

export const MACRO_BASELINE = {
  year: 2025,
  gdp: 2850,              // Md EUR
  debt: 3300,             // Md EUR (~115.8% GDP)
  debtToGdp: 115.8,       // %

  // Interest rate parameters
  // Note: Effective rate on existing stock is ~2.1% (much debt locked at low rates)
  // PLF 2025 charge de la dette: ~54 Md€ État, ~70 Md€ total APU
  // At 115.8% debt/GDP, risk premium adds ~1.93%, so base must be ~0.17% for total = 2.1%
  baseInterestRate: -0.0004,   // Base rate (risk premium + political premium brings total to ~2.1%)

  // Sovereign risk premium model (France-specific calibration)
  // Sources: IMF (2017), EC (2018), France OAT spreads 2024-2025
  riskPremium: {
    enabled: true,

    // Linear regime (60-90% debt/GDP): stable spread
    threshold1: 60,         // Below this: no premium
    slope1: 0.0003,        // 3 bps per pp (IMF/EC consensus)

    // Moderate regime (90-120%): increasing pressure
    threshold2: 90,
    slope2: 0.0004,        // 4 bps per pp (France historical)

    // High regime (>120%): non-linear acceleration
    threshold3: 120,
    slope3: 0.0010,        // 10 bps per pp (crisis risk)

    // Political risk component (context: France 2024-2025)
    // OAT spread widened 21 bps due to political instability
    // Source: Bloomberg OAT-Bund 10Y spread Q4 2024; ECB Financial Stability Review Nov 2024
    politicalPremium: 0.0021,  // 21 bps already priced in; user slider adds ADDITIONAL premium
  },

  // Growth parameters
  nominalGrowth: 0.025,      // 2.5% (0.7% real + 1.8% inflation)
  realGrowth: 0.007,         // 0.7% baseline (HCFP / PLF 2025 revised)
  inflation: 0.018,          // 1.8% ECB target

  // Fiscal parameters
  // Primary deficit = total deficit - interest = 156.5 - 69.3 = 87.2 Md€
  primaryDeficit: 87.2,      // Md EUR (deficit minus interest)

  // Tax elasticity to GDP (automatic stabilizers)
  taxElasticity: 0.45,       // 45% of GDP growth → revenue

  // Labour market (Okun's Law)
  unemploymentRate: 7.3,     // % France 2025 (INSEE)
  okunCoefficient: 0.5,      // standard for France
}

// =============================================================================
// DEBT STOCK INERTIA PARAMETERS (Module 1)
// =============================================================================

// Annual rollover rate: 12.5% of stock matures each year (avg OAT maturity ~8 years)
export const ROLLOVER_RATE = 0.125

// Deficit stress premium: 17 bps per 1pp deficit/GDP above threshold
export const DEFICIT_STRESS_THRESHOLD = 4.0      // % GDP
export const DEFICIT_STRESS_SENSITIVITY = 0.0017 // 17 bps per 1% deficit/GDP above threshold

// =============================================================================
// STRUCTURAL REFORM PARAMETERS
// =============================================================================

/**
 * Structural reform growth effects
 * Sources: OECD (2014), IMF Article IV 2025, Banque de France (2017)
 *
 * Calibration notes:
 * - OECD 2014: Full reform package → +0.4 pp/year for 10 years
 * - IMF 2025: +0.3 pp potential growth → -10pp debt/GDP long-term
 * - BdF 2017: Best-practice PMR/LMR → +6% potential GDP (~0.6pp/year)
 * - Effects materialize with 2-3 year lag, peak at 5-10 years
 */
export const STRUCTURAL_REFORMS = {
  // Individual reform packages with estimated effects
  laborMarket: {
    label: "Flexibilisation marché du travail",
    description: "Assouplissement code du travail, réforme assurance chômage",
    growthEffect: 0.0015,     // +0.15 pp/year
    lag: 2,                   // Years to materialize
    duration: 10,             // Years of peak effect
    source: "IMF Article IV, OECD Labour Market Reviews",
    confidence: "medium",     // High uncertainty on magnitude
  },

  productMarketRegulation: {
    label: "Ouverture professions réglementées",
    description: "Déréglementation professions (notaires, pharmaciens, etc.)",
    growthEffect: 0.0010,     // +0.10 pp/year
    lag: 2,
    duration: 8,
    source: "Autorité de la concurrence, OECD PMR indicators",
    confidence: "medium-high",
  },

  planning: {
    label: "Réforme droit de l'urbanisme",
    description: "Simplification règles urbanisme et construction",
    growthEffect: 0.0020,     // +0.20 pp/year (uplifted: France housing tension 4.8 > UK 3.5 baseline)
    lag: 3,                   // Longer lag (housing stock adjustment)
    duration: 15,             // Very long-lived effects
    source: "FNAIM 2024 tension locative, INSEE Enquete Logement, Hilber & Vermeulen (2016)",
    confidence: "low-medium", // Extrapolated from UK with France-specific uplift
  },

  education: {
    label: "Réforme formation professionnelle",
    description: "Amélioration formation, apprentissage",
    growthEffect: 0.0008,     // +0.08 pp/year
    lag: 5,                   // Very long lag (human capital)
    duration: 20,             // Permanent effects
    source: "OECD Education at a Glance",
    confidence: "low",        // Very uncertain, long-term
  },

  energy: {
    label: "Dérégulation marché énergie",
    description: "Concurrence accrue, simplification réglementation",
    growthEffect: 0.0007,     // +0.07 pp/year (reduced: France industrial electricity 100 EUR/MWh already competitive vs EU avg ~120)
    lag: 2,
    duration: 10,
    source: "CRE 2024, Eurostat energy prices",
    confidence: "medium",
  },

  // Composite scenarios
  ambitious: {
    label: "Paquet structurel ambitieux",
    description: "Combinaison labour + PMR + planning + education",
    growthEffect: 0.0040,     // +0.40 pp/year (some overlap)
    lag: 2,
    duration: 12,
    source: "OECD (2014) comprehensive reform estimate",
    confidence: "medium",     // Well-studied
  },

  modest: {
    label: "Réformes ciblées (labour + PMR)",
    description: "Focus marché du travail et professions réglementées",
    growthEffect: 0.0020,     // +0.20 pp/year
    lag: 2,
    duration: 10,
    source: "IMF baseline structural reform scenario",
    confidence: "medium-high",
  },
}

// =============================================================================
// DEMOGRAPHIC DRIFT PARAMETERS
// =============================================================================
// Source: INSEE 2024 Projections de population, COR 2024 annual report
// Births -24% vs 2010, fertility 1.60, first negative natural balance since 1945
// Pension (303.4 Md) and health (262.3 Md) spending grow faster than GDP
// due to worsening dependency ratio.

export const DEMOGRAPHIC_PARAMS = {
  dependencyRatioDriftPerYear: 0.0048,  // +0.48 pp/year (INSEE central scenario)
  pensionElasticityToDependency: 0.80,
  healthElasticityToDependency: 0.50,
  pensionBaseline: 303.4,  // Md EUR (PLFSS 2025 projection)
  healthBaseline: 262.3,   // Md EUR (PLFSS 2025 ONDAM projection)
}

// Pre-computed annual demographic pressure increment (Md EUR/year)
// = 0.0048 * (303.4 * 0.80 + 262.3 * 0.50) = 0.0048 * (242.72 + 131.15) = 0.0048 * 373.87 ≈ 1.795
export const DEMOGRAPHIC_PRESSURE_PER_YEAR =
  DEMOGRAPHIC_PARAMS.dependencyRatioDriftPerYear *
  (DEMOGRAPHIC_PARAMS.pensionBaseline * DEMOGRAPHIC_PARAMS.pensionElasticityToDependency +
   DEMOGRAPHIC_PARAMS.healthBaseline * DEMOGRAPHIC_PARAMS.healthElasticityToDependency)

// =============================================================================
// SENIOR EMPLOYMENT PARAMETERS
// =============================================================================
// Source: DARES 2024, Eurostat senior employment, Hartz reform literature
// Labour market reform should increase senior employment rate (58% → 65%),
// generating additional cotisations revenue.

export const SENIOR_EMPLOYMENT = {
  currentRate: 0.58,              // 58% current senior employment rate
  euBenchmark: 0.65,              // 65% EU best practice
  seniorPopulation: 8.5e6,        // 8.5M seniors (55-64)
  avgCotisationsPerWorker: 14350, // EUR/year average cotisations per worker
  rateGainPerReformYear: 0.005,   // +0.5 pp/year gain from reform
  maxGain: 0.07,                  // Cap at 7 pp (58% → 65%)
}

// =============================================================================
// PENSION REFORM PARAMETERS
// =============================================================================
// Source: francetdb.com/#retraites, COR 2024 annual report
// Models structural pension reforms: retirement age, desindexation, pension cap,
// capitalisation, and Swedish notional accounts.

export const PENSION_REFORM = {
  // Baseline pension mass (303.4 Md€ Sécu vieillesse — same as DEMOGRAPHIC_PARAMS.pensionBaseline)
  pensionMass: 303.4,
  cotisantsPerRetraite: 1.70,
  ratioDeclinePerYear: 0.012,
  part65: 21.5,
  part65GrowthPerYear: 0.4,

  // Retirement age mechanics (francetdb: rtRunModel)
  retirementAge: {
    current: 64,
    pensionMassEffectPerYear: -0.025,    // -2.5% pension mass per year above current age
    ratioImprovementPerYear: 0.1,        // +0.1 cotisants/retraité per year above current
    rampUpYears: 8,                      // 8-year phase-in for full effect
  },

  // Desindexation mechanics
  desindexation: {
    revaloReductionPerPoint: 0.005,      // Each point reduces revalorisation by 0.5pt
    rampYears: 3,                        // 3-year ramp-up
  },

  // Pension cap (plafonnement hautes pensions)
  pensionCap: {
    rampYears: 3,                        // 3-year phase-in
  },

  // Capitalisation (redirection of cotisations to private funds)
  capitalisation: {
    transitionYears: 20,
    cotisationsShareOfRecettes: 0.28,
  },

  // Swedish notional accounts
  notionnel: {
    pensionMassReduction: 0.06,          // -6% of pension mass at full implementation
    rampUpYears: 15,                     // 15-year phase-in
    startYear: 2027,
  },

  // Noria effect: new cohorts have slightly lower relative pensions
  noriaEffect: {
    maxDampening: 0.25,
    dampeningPerYear: 0.010,
  },

  // Hard floor: pension mass cannot go below 65% of unreformed level
  pensionFloor: 0.65,
}

// =============================================================================
// MIGRATION FISCAL IMPACT PARAMETERS
// =============================================================================
// Source: francetdb.com RT_DEFAULT_HYP, INSEE immigration/emigration data 2023
// Models net migration's effect on the labor force and fiscal balance.
// France has a net "brain drain" — emigrants are more productive than immigrants.

export const MIGRATION_PARAMS = {
  immigration: {
    annualFlow: 270000,
    employmentRate: 0.57,
    productivityFactor: 0.75,
  },
  emigration: {
    annualFlow: 200000,
    employmentRate: 0.88,
    productivityFactor: 1.10,
  },
  avgCotisationsPerWorker: 14350,   // EUR/year (same as SENIOR_EMPLOYMENT)
  avgGdpPerWorker: 82000,           // EUR/year (PIB 2850 Md / ~34.7M employed)
}

// Pre-computed net effective worker change per year
// immigrantWorkers = 270k × 0.57 × 0.75 = 115,425
// emigrantWorkers = 200k × 0.88 × 1.10 = 193,600
// net = 115,425 - 193,600 = -78,175
export const MIGRATION_NET_WORKERS_PER_YEAR =
  MIGRATION_PARAMS.immigration.annualFlow * MIGRATION_PARAMS.immigration.employmentRate * MIGRATION_PARAMS.immigration.productivityFactor -
  MIGRATION_PARAMS.emigration.annualFlow * MIGRATION_PARAMS.emigration.employmentRate * MIGRATION_PARAMS.emigration.productivityFactor

// =============================================================================
// DEPENDANCE (AUTONOMIE) SPENDING PARAMETERS
// =============================================================================
// Source: francetdb.com, DREES projections dépendance, PLFSS 2025
// Autonomie/dépendance spending grows at 5.5%/year, significantly faster than GDP.

export const DEPENDANCE_PARAMS = {
  baseline: 43.5,              // Md€ (PLFSS 2025 branche autonomie)
  annualGrowthRate: 0.055,     // 5.5%/year
  gdpGrowthBaseline: 0.025,   // Nominal GDP growth for comparison
}

// =============================================================================
// INTEREST RATE CALCULATION
// =============================================================================

/**
 * Calculate effective interest rate with sovereign risk premium
 *
 * Methodology:
 * - Piecewise linear function with three debt/GDP regimes
 * - Deficit stress premium above 4% deficit/GDP (Module 1)
 * - Calibrated to France OAT spreads 2010-2025
 *
 * @param {number} debtRatio   - Debt-to-GDP ratio (%)
 * @param {number} deficitRatio - Deficit-to-GDP ratio (%, positive = deficit)
 * @param {object} options     - Configuration
 * @returns {number} Effective interest rate (decimal, e.g., 0.035 = 3.5%)
 */
export function calculateInterestRate(debtRatio, deficitRatio = 0, options = {}) {
  const {
    baseRate = MACRO_BASELINE.baseInterestRate,
    enablePremium = true,
    politicalRisk = 0,
  } = options

  if (!enablePremium) {
    return baseRate + politicalRisk + MACRO_BASELINE.riskPremium.politicalPremium
  }

  const { riskPremium } = MACRO_BASELINE
  let premium = 0

  // Regime 1: Low debt (<60% GDP) - no premium
  if (debtRatio <= riskPremium.threshold1) {
    premium = 0
  }
  // Regime 2: Moderate debt (60-90%) - linear slope
  else if (debtRatio <= riskPremium.threshold2) {
    const excess = debtRatio - riskPremium.threshold1
    premium = excess * riskPremium.slope1
  }
  // Regime 3: High debt (90-120%) - steeper slope
  else if (debtRatio <= riskPremium.threshold3) {
    // Cumulative from regime 2
    const regime2Premium = (riskPremium.threshold2 - riskPremium.threshold1) * riskPremium.slope1
    const excess = debtRatio - riskPremium.threshold2
    premium = regime2Premium + (excess * riskPremium.slope2)
  }
  // Regime 4: Very high debt (>120%) - crisis risk
  else {
    const regime2Premium = (riskPremium.threshold2 - riskPremium.threshold1) * riskPremium.slope1
    const regime3Premium = (riskPremium.threshold3 - riskPremium.threshold2) * riskPremium.slope2
    const excess = debtRatio - riskPremium.threshold3
    premium = regime2Premium + regime3Premium + (excess * riskPremium.slope3)
  }

  // Deficit stress premium (Module 1): 17 bps per 1pp above 4% threshold
  let deficitPremium = 0
  if (deficitRatio > DEFICIT_STRESS_THRESHOLD) {
    deficitPremium = (deficitRatio - DEFICIT_STRESS_THRESHOLD) * DEFICIT_STRESS_SENSITIVITY
  }

  return baseRate + premium + deficitPremium + politicalRisk + MACRO_BASELINE.riskPremium.politicalPremium
}

// =============================================================================
// STRUCTURAL REFORM GROWTH PATH
// =============================================================================

/**
 * Calculate growth boost from structural reforms over time
 *
 * Model: Growth effect phases in over 'lag' years, peaks for 'duration' years,
 * then gradually fades as economy converges to new steady state
 *
 * @param {number} year - Years since reform announcement
 * @param {object} reform - Reform parameters
 * @returns {number} Growth boost this year (pp, e.g., 0.002 = +0.2 pp)
 */
export function calculateReformGrowthBoost(year, reform) {
  const { growthEffect, lag, duration } = reform

  // Phase-in period (years 0 to lag)
  if (year < lag) {
    // Linear phase-in: 0% → 100% over lag years
    return growthEffect * (year / lag)
  }

  // Peak period (years lag to lag+duration)
  if (year < lag + duration) {
    return growthEffect
  }

  // Fade-out period (after peak)
  // Exponential decay: effect halves every 10 years
  const yearsSincePeak = year - (lag + duration)
  const decayRate = 0.93  // 93% retention per year (~10 year half-life)
  return growthEffect * Math.pow(decayRate, yearsSincePeak)
}

// =============================================================================
// MULTI-YEAR FISCAL PROJECTION
// =============================================================================

/**
 * Project fiscal path with interest rate feedback and structural reforms
 *
 * This is the CORE calculation engine. It integrates:
 * 1. Policy changes (revenue/spending adjustments)
 * 2. Economic feedback (growth effects, tax elasticity)
 * 3. Sovereign risk premium (endogenous interest rates)
 * 4. Debt stock inertia (avg portfolio rate with 12.5% annual rollover)
 * 5. Deficit stress premium (flow-based interest rate component)
 * 6. Structural reforms (productivity/potential growth)
 * 7. Unemployment via Okun's Law
 *
 * @param {object} policyChanges - User's policy adjustments
 * @param {object} options - Projection configuration
 * @returns {array} Year-by-year projection
 */
export function projectFiscalPath(policyChanges, options = {}) {
  const {
    years = 10,
    enableRiskPremium = true,
    politicalRiskPremium = 0,
    structuralReform = null,  // From STRUCTURAL_REFORMS
    enableDemographicDrift = true,
    structuralReformKeys = null,  // Array of reform keys for senior employment calc
    pensionReform = null,         // { retirementAge, desindexation, pensionCap, capitalisation, notionnel }
    enableMigrationImpact = true,
    enableDependanceDrift = true,
  } = options

  const {
    revenueChange = 0,
    spendingChange = 0,
    growthEffect = 0,        // From tax/spending policy changes
  } = policyChanges

  const results = []

  // Initialize state variables
  let gdp = MACRO_BASELINE.gdp
  let debt = MACRO_BASELINE.debt

  // Deficit improvement from policy (positive = better)
  const deficitImprovement = revenueChange - spendingChange

  // Initial portfolio rate: based on debt/GDP only (no deficit premium for initial stock)
  // This reflects that existing debt was issued at historical rates
  let avgPortfolioRate = calculateInterestRate(MACRO_BASELINE.debtToGdp, 0, {
    enablePremium: enableRiskPremium,
    politicalRisk: politicalRiskPremium,
  })

  // Initial deficit/GDP ratio for deficit stress premium (France 2025 actual)
  let prevDeficitRatio = Math.abs(MACRO_BASELINE.primaryDeficit / MACRO_BASELINE.gdp * 100) + 2.43
  // ≈ 5.17% (primary deficit/GDP + interest/GDP at baseline)

  for (let t = 0; t <= years; t++) {
    // 1. Calculate growth rate this year
    let nominalGrowth = MACRO_BASELINE.nominalGrowth

    // Add policy-driven growth effect
    nominalGrowth += growthEffect

    // Add structural reform boost (if selected)
    if (structuralReform) {
      const reformBoost = calculateReformGrowthBoost(t, structuralReform)
      nominalGrowth += reformBoost
    }

    // 2. Calculate marginal interest rate (includes deficit stress premium)
    const debtRatio = (debt / gdp) * 100
    const effectiveRate = calculateInterestRate(debtRatio, prevDeficitRatio, {
      enablePremium: enableRiskPremium,
      politicalRisk: politicalRiskPremium,
    })

    // 3. Debt stock inertia: interest uses avg portfolio rate (start of year)
    //    Then update portfolio rate for next year via 12.5% annual rollover
    const interest = debt * avgPortfolioRate
    avgPortfolioRate = avgPortfolioRate * (1 - ROLLOVER_RATE) + effectiveRate * ROLLOVER_RATE

    // 4. Calculate fiscal outcomes
    const primaryDeficit = MACRO_BASELINE.primaryDeficit - deficitImprovement
    const totalDeficit = primaryDeficit + interest

    // 5. Calculate fiscal feedback from growth
    // Higher growth → more revenue (automatic stabilizers)
    const growthFeedback = (nominalGrowth - MACRO_BASELINE.nominalGrowth) * gdp * MACRO_BASELINE.taxElasticity

    // 5b. Demographic pressure: pension + health spending grow faster than GDP
    const demographicPressure = enableDemographicDrift ? t * DEMOGRAPHIC_PRESSURE_PER_YEAR : 0

    // 5c. Senior employment revenue (only when labor market reform is active)
    let seniorRevenue = 0
    // Reforms that include labor market component and thus generate senior employment gains
    const laborReformKeys = ['laborMarket', 'ambitious', 'modest']
    const hasLaborReform = (structuralReformKeys && structuralReformKeys.includes('laborMarket')) ||
      (structuralReform && structuralReform === STRUCTURAL_REFORMS.laborMarket) ||
      (structuralReform && structuralReform === STRUCTURAL_REFORMS.ambitious) ||
      (structuralReform && structuralReform === STRUCTURAL_REFORMS.modest)
    if (hasLaborReform && structuralReform) {
      const reformMaturityYears = Math.max(0, t - structuralReform.lag)
      const rateGain = Math.min(reformMaturityYears * SENIOR_EMPLOYMENT.rateGainPerReformYear, SENIOR_EMPLOYMENT.maxGain)
      const additionalWorkers = SENIOR_EMPLOYMENT.seniorPopulation * rateGain
      seniorRevenue = additionalWorkers * SENIOR_EMPLOYMENT.avgCotisationsPerWorker / 1e9  // Md EUR
    }

    // 5d. Pension reform effects (dynamic, year-by-year)
    let pensionReformSaving = 0
    if (pensionReform) {
      const basePensionMass = PENSION_REFORM.pensionMass

      // Retirement age effect: each year above 64 → -2.5% pension mass
      const ageAboveCurrent = pensionReform.retirementAge - PENSION_REFORM.retirementAge.current
      if (ageAboveCurrent !== 0) {
        const rampFactor = Math.min(t / PENSION_REFORM.retirementAge.rampUpYears, 1)
        pensionReformSaving += basePensionMass * ageAboveCurrent
          * Math.abs(PENSION_REFORM.retirementAge.pensionMassEffectPerYear) * rampFactor
      }

      // Desindexation: cumulative reduction over time
      if (pensionReform.desindexation !== 0) {
        const desindexRamp = Math.min(t / PENSION_REFORM.desindexation.rampYears, 1)
        const annualReduction = pensionReform.desindexation
          * PENSION_REFORM.desindexation.revaloReductionPerPoint
        pensionReformSaving += basePensionMass * annualReduction * t * desindexRamp
      }

      // Pension cap: direct % cut of pension mass
      if (pensionReform.pensionCap > 0) {
        const capRamp = Math.min(t / PENSION_REFORM.pensionCap.rampYears, 1)
        pensionReformSaving += basePensionMass * (pensionReform.pensionCap / 100) * capRamp
      }

      // Notional accounts: -6% pension mass over 15 years
      if (pensionReform.notionnel) {
        const yearsActive = Math.max(0, t - (PENSION_REFORM.notionnel.startYear - MACRO_BASELINE.year))
        const notionnelRamp = Math.min(yearsActive / PENSION_REFORM.notionnel.rampUpYears, 1)
        pensionReformSaving += basePensionMass * PENSION_REFORM.notionnel.pensionMassReduction * notionnelRamp
      }

      // Apply pension floor: savings cannot reduce pension mass below 65% of baseline
      const maxSaving = basePensionMass * (1 - PENSION_REFORM.pensionFloor)
      pensionReformSaving = Math.min(pensionReformSaving, maxSaving)
    }

    // 5e. Migration fiscal impact
    let migrationImpact = 0
    if (enableMigrationImpact) {
      // Cumulative net worker change × avg cotisations
      migrationImpact = t * MIGRATION_NET_WORKERS_PER_YEAR * MIGRATION_PARAMS.avgCotisationsPerWorker / 1e9
    }

    // 5f. Dependance spending growth (excess over GDP growth)
    let dependancePressure = 0
    if (enableDependanceDrift) {
      dependancePressure = DEPENDANCE_PARAMS.baseline *
        (Math.pow(1 + DEPENDANCE_PARAMS.annualGrowthRate, t) -
         Math.pow(1 + DEPENDANCE_PARAMS.gdpGrowthBaseline, t))
    }

    const adjustedDeficit = totalDeficit - growthFeedback + demographicPressure
      - seniorRevenue - pensionReformSaving - migrationImpact + dependancePressure

    // 6. Unemployment via Okun's Law
    // Δunemployment = -okunCoefficient × (realGrowth - potentialRealGrowth)
    const realGrowthThisYear = nominalGrowth - MACRO_BASELINE.inflation
    const unemploymentRate = MACRO_BASELINE.unemploymentRate
      + (MACRO_BASELINE.realGrowth - realGrowthThisYear) * MACRO_BASELINE.okunCoefficient

    // 7. Store results
    results.push({
      year: MACRO_BASELINE.year + t,

      // Flow variables (Md EUR)
      gdp: Math.round(gdp * 10) / 10,
      deficit: Math.round(adjustedDeficit * 10) / 10,
      interest: Math.round(interest * 10) / 10,
      primaryDeficit: Math.round(primaryDeficit * 10) / 10,

      // Stock variable (Md EUR)
      debt: Math.round(debt * 10) / 10,

      // Ratios (% GDP)
      debtRatio: Math.round(debtRatio * 10) / 10,
      deficitRatio: Math.round((adjustedDeficit / gdp * 100) * 10) / 10,
      interestRatio: Math.round((interest / gdp * 100) * 100) / 100,

      // Interest rate (% using portfolio rate — actual borrowing cost)
      effectiveInterestRate: Math.round(avgPortfolioRate * 10000) / 100,

      // Labour market
      unemploymentRate: Math.round(unemploymentRate * 100) / 100,

      // Growth
      nominalGrowthRate: Math.round(nominalGrowth * 10000) / 100,

      // Risk premium breakdown (marginal rate - base, for transparency)
      riskPremiumBps: Math.round((effectiveRate - MACRO_BASELINE.baseInterestRate) * 10000),

      // New decomposition fields (backward compatible — appended)
      demographicPressure: Math.round(demographicPressure * 10) / 10,
      seniorRevenue: Math.round(seniorRevenue * 10) / 10,
      pensionReformSaving: Math.round(pensionReformSaving * 10) / 10,
      migrationImpact: Math.round(migrationImpact * 10) / 10,
      dependancePressure: Math.round(dependancePressure * 10) / 10,
    })

    // 8. Evolve to next year
    prevDeficitRatio = Math.abs(adjustedDeficit / gdp * 100)
    gdp = gdp * (1 + nominalGrowth)
    debt = debt + adjustedDeficit
  }

  return results
}

// =============================================================================
// COMPARISON UTILITIES
// =============================================================================

/**
 * Generate baseline projection (no policy change, no reforms)
 */
export function getBaselineProjection(years = 10) {
  return projectFiscalPath({
    revenueChange: 0,
    spendingChange: 0,
    growthEffect: 0,
  }, {
    years,
    enableRiskPremium: true,
    structuralReform: null,
  })
}

/**
 * Compare two projections at key time horizons
 */
export function compareProjections(projectionA, projectionB, targetYears = [1, 2, 5, 10]) {
  const comparisons = []

  for (const offset of targetYears) {
    if (offset >= projectionA.length || offset >= projectionB.length) continue

    const a = projectionA[offset]
    const b = projectionB[offset]

    comparisons.push({
      year: a.year,
      yearOffset: offset,
      debtRatioDiff: Math.round((a.debtRatio - b.debtRatio) * 10) / 10,
      deficitRatioDiff: Math.round((a.deficitRatio - b.deficitRatio) * 10) / 10,
      interestDiff: Math.round((a.interest - b.interest) * 10) / 10,
    })
  }

  return comparisons
}

/**
 * Calculate interest rate "doom loop" severity
 * Returns metrics on debt-interest feedback loop
 */
export function assessDoomLoop(projection) {
  if (!projection || projection.length === 0) {
    return {
      debtRatioChange: 0,
      interestRatioChange: 0,
      premiumIncreaseBps: 0,
      severity: "low",
      doomLoopActive: false,
    }
  }

  const start = projection[0]
  const end = projection[projection.length - 1]

  const debtIncrease = end.debtRatio - start.debtRatio
  const interestIncrease = end.interestRatio - start.interestRatio
  const premiumIncrease = end.riskPremiumBps - start.riskPremiumBps

  // Severity: how much is interest crowding out fiscal space?
  // Guard against division by zero when deficitRatio ≈ 0
  const severity = Math.abs(end.deficitRatio) > 0.01
    ? interestIncrease / Math.abs(end.deficitRatio)
    : 0

  return {
    debtRatioChange: Math.round(debtIncrease * 10) / 10,
    interestRatioChange: Math.round(interestIncrease * 100) / 100,
    premiumIncreaseBps: Math.round(premiumIncrease),
    severity: severity > 0.3 ? "high" : severity > 0.15 ? "medium" : "low",
    doomLoopActive: premiumIncrease > 20,  // >20 bps increase = loop engaged
  }
}

// =============================================================================
// VALIDATION & DIAGNOSTICS
// =============================================================================

/**
 * Validate projection results against known bounds
 * Helps catch calculation errors
 */
export function validateProjection(projection) {
  const warnings = []

  for (let i = 1; i < projection.length; i++) {
    const year = projection[i]

    // Check for unrealistic debt levels
    if (year.debtRatio > 200) {
      warnings.push(`Year ${year.year}: Debt ratio exceeds 200% (${year.debtRatio}%)`)
    }

    // Check for unrealistic interest rates
    if (year.effectiveInterestRate > 10) {
      warnings.push(`Year ${year.year}: Interest rate exceeds 10% (${year.effectiveInterestRate}%)`)
    }

    // Check for GDP collapse
    const gdpGrowth = (year.gdp / projection[i-1].gdp - 1) * 100
    if (gdpGrowth < -5) {
      warnings.push(`Year ${year.year}: GDP decline exceeds 5% (${gdpGrowth.toFixed(1)}%)`)
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

export default {
  MACRO_BASELINE,
  ROLLOVER_RATE,
  DEFICIT_STRESS_THRESHOLD,
  DEFICIT_STRESS_SENSITIVITY,
  STRUCTURAL_REFORMS,
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
  compareProjections,
  assessDoomLoop,
  validateProjection,
}
