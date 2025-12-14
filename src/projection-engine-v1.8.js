/**
 * FRENCH BUDGET SIMULATOR - PROJECTION ENGINE v1.8
 * 
 * New features:
 * - Enhanced sovereign risk premium model (France-calibrated)
 * - Structural reform growth effects
 * 
 * Academic sources:
 * - Interest rates: IMF (2017), EC (2018), Kumar & Baldacci (2010)
 * - Structural reforms: OECD (2014), IMF Article IV France (2025)
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
  baseInterestRate: 0.032,    // 3.2% average rate on outstanding debt
  
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
    politicalPremium: 0.0000,  // User can add separately if modeling scenarios
  },
  
  // Growth parameters
  nominalGrowth: 0.029,      // 2.9% (1.1% real + 1.8% inflation)
  realGrowth: 0.011,         // 1.1% baseline
  inflation: 0.018,          // 1.8% ECB target
  
  // Fiscal parameters  
  primaryDeficit: 84,        // Md EUR (deficit minus interest)
  
  // Tax elasticity to GDP (automatic stabilizers)
  taxElasticity: 0.45,       // 45% of GDP growth → revenue
}

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
    growthEffect: 0.0015,     // +0.15 pp/year  
    lag: 3,                   // Longer lag (housing stock adjustment)
    duration: 15,             // Very long-lived effects
    source: "UK planning reform estimates (Hilber & Vermeulen 2016)",
    confidence: "low-medium", // Extrapolated from UK
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
    growthEffect: 0.0012,     // +0.12 pp/year
    lag: 2,
    duration: 10,
    source: "CRE estimates, EC energy market integration",
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
// INTEREST RATE CALCULATION
// =============================================================================

/**
 * Calculate effective interest rate with sovereign risk premium
 * 
 * Methodology:
 * - Piecewise linear function with three regimes
 * - Calibrated to France OAT spreads 2010-2025
 * - Validated against IMF debt sustainability analysis
 * 
 * @param {number} debtRatio - Debt-to-GDP ratio (%)
 * @param {object} options - Configuration
 * @returns {number} Effective interest rate (decimal, e.g., 0.035 = 3.5%)
 */
export function calculateInterestRate(debtRatio, options = {}) {
  const {
    baseRate = MACRO_BASELINE.baseInterestRate,
    enablePremium = true,
    politicalRisk = 0,
  } = options
  
  if (!enablePremium) {
    return baseRate + politicalRisk
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
  
  return baseRate + premium + politicalRisk
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
 * 4. Structural reforms (productivity/potential growth)
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
  } = options
  
  const {
    revenueChange = 0,
    spendingChange = 0,
    growthEffect = 0,        // From tax policy changes
  } = policyChanges
  
  const results = []
  
  // Initialize state variables
  let gdp = MACRO_BASELINE.gdp
  let debt = MACRO_BASELINE.debt
  
  // Deficit improvement from policy (positive = better)
  const deficitImprovement = revenueChange - spendingChange
  
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
    
    // 2. Calculate effective interest rate (endogenous)
    const debtRatio = (debt / gdp) * 100
    const effectiveRate = calculateInterestRate(debtRatio, {
      enablePremium: enableRiskPremium,
      politicalRisk: politicalRiskPremium,
    })
    
    // 3. Calculate fiscal outcomes
    const interest = debt * effectiveRate
    const primaryDeficit = MACRO_BASELINE.primaryDeficit - deficitImprovement
    const totalDeficit = primaryDeficit + interest
    
    // 4. Calculate fiscal feedback from growth
    // Higher growth → more revenue (automatic stabilizers)
    const growthFeedback = (nominalGrowth - MACRO_BASELINE.nominalGrowth) * gdp * MACRO_BASELINE.taxElasticity
    const adjustedDeficit = totalDeficit - growthFeedback
    
    // 5. Store results
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
      
      // Parameters used
      effectiveInterestRate: Math.round(effectiveRate * 10000) / 100,  // bps → %
      nominalGrowthRate: Math.round(nominalGrowth * 10000) / 100,
      
      // Risk premium breakdown (for transparency)
      riskPremiumBps: Math.round((effectiveRate - MACRO_BASELINE.baseInterestRate) * 10000),
    })
    
    // 6. Evolve to next year
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
  const start = projection[0]
  const end = projection[projection.length - 1]
  
  const debtIncrease = end.debtRatio - start.debtRatio
  const interestIncrease = end.interestRatio - start.interestRatio
  const premiumIncrease = end.riskPremiumBps - start.riskPremiumBps
  
  // Severity: how much is interest crowding out fiscal space?
  const severity = interestIncrease / Math.abs(end.deficitRatio)
  
  return {
    debtRatioChange: Math.round(debtIncrease * 10) / 10,
    interestRatioChange: Math.round(interestIncrease * 100) / 100,
    premiumIncreaseB ps: Math.round(premiumIncrease),
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
  STRUCTURAL_REFORMS,
  calculateInterestRate,
  calculateReformGrowthBoost,
  projectFiscalPath,
  getBaselineProjection,
  compareProjections,
  assessDoomLoop,
  validateProjection,
}
