/**
 * Policy impact calculation - extracted from App.jsx for testability
 *
 * Pure function that converts slider lever positions into
 * revenue/spending/growth impacts in Md€.
 */

// =============================================================================
// INTEGRATED BASELINE DATA - PLF 2025 + PLFSS 2026
// =============================================================================

export const BASELINE = {
  // État (State Budget - PLF 2025)
  etat: {
    revenuTotal: 315.3,        // 94.1 + 97.5 + 58.2 + 65.5
    incomeTax: 94.1,
    vat: 97.5,
    corporateTax: 58.2,        // PLF 2025 incl. temporary contribution
    otherTax: 65.5,

    spendingTotal: 444.97,
    education: 88.9,
    defense: 65.0,
    solidarity: 30.0,
    ecological: 45.0,
    otherSpending: 216.07,

    deficit: -129.7,           // Internal consistency: 315.3 - 444.97
  },

  // Sécurité Sociale (PLFSS 2026) - Source: CCSS 2024, PLFSS 2026 Annexe 3
  securiteSociale: {
    revenuTotal: 659.4,
    // Revenue breakdown (CCSS 2024 structure)
    cotisations: 372.0,      // 56.4% - Cotisations employeurs + salariés
    csg: 135.0,              // 20.4% - CSG (all sources)
    impotsTaxes: 117.0,      // 17.7% - TVA affectée (~58) + autres taxes (~59)
    cotisationsEtat: 18.0,   // 2.8%  - Compensations État pour exonérations
    transferts: 11.0,        // 1.6%  - Transferts inter-régimes
    autresProduits: 6.4,     // 1.0%  - Produits divers

    spendingTotal: 686.6,      // Sum of branches: 262.3+303.4+59.4+18.0+43.5
    // Expenditure by branch (PLFSS 2026 Annexe 3)
    maladie: 262.3,          // Branche maladie (PLFSS 2025 ONDAM projection)
    vieillesse: 303.4,       // Branche vieillesse (PLFSS 2025 pension projection)
    famille: 59.4,           // Branche famille
    atmp: 18.0,              // Accidents du travail - Maladies professionnelles
    autonomie: 43.5,         // Branche autonomie

    deficit: -17.5,          // PLFSS 2026 target
  },

  // Integrated totals (État + ASSO) - excludes collectivités locales
  integrated: {
    revenuTotal: 974.7,      // 315.3 + 659.4
    spendingTotal: 1131.6,   // 444.97 + 686.6
    deficit: -147.2,         // -129.7 + (-17.5)
  },
}

// =============================================================================
// POLITICAL PRESETS
// =============================================================================

export const PRESETS = {
  plf2025: {
    label: "PLF 2025 (Barnier)",
    description: "Budget initial présenté par Michel Barnier",
    levers: {
      incomeTaxChange: 0.5,
      vatChange: 0,
      corpTaxChange: 1,
      spendingEducation: -2,
      spendingDefense: 0,
      spendingSolidarity: -5,
      pensionIndexation: -1,
      healthSpending: -2,
      socialContributions: 0,
      csgRate: 0,
    },
    reforms: [],
  },

  generationLibre: {
    label: "Génération Libre",
    description: "Contre-budget libéral: baisse d'impôts, réformes structurelles",
    levers: {
      incomeTaxChange: -3,
      vatChange: 0,
      corpTaxChange: -5,
      spendingEducation: -10,
      spendingDefense: 0,
      spendingSolidarity: -15,
      pensionIndexation: -2,
      healthSpending: -8,
      socialContributions: -2,
      csgRate: 0,
    },
    reforms: ['hartzIV', 'housingAmbitious'],
  },

  knafo: {
    label: "Sarah Knafo (RN/Reconquête)",
    description: "Contre-budget Knafo: -20 Md€ recettes, -80 Md€ dépenses",
    levers: {
      incomeTaxChange: -2,
      vatChange: 0,
      corpTaxChange: -4,
      spendingSolidarity: -60,
      spendingEducation: -10,
      spendingDefense: 0,
      pensionIndexation: 0,
      healthSpending: -5,
      socialContributions: 0,
      csgRate: 0,
    },
    reforms: [],
  },

  nfp: {
    label: "Nouveau Front Populaire",
    description: "Budget de gauche: hausses d'impôts, augmentation des dépenses sociales",
    levers: {
      incomeTaxChange: 5,
      vatChange: 0,
      corpTaxChange: 3,
      spendingEducation: 10,
      spendingDefense: 0,
      spendingSolidarity: 15,
      pensionIndexation: 1,
      healthSpending: 5,
      socialContributions: 0,
      csgRate: 2,
    },
    reforms: [],
  },
}

// =============================================================================
// PENSION REFORM PRESETS (COR scenarios)
// =============================================================================
// Source: francetdb.com COR scenarios, Conseil d'Orientation des Retraites 2024

export const PENSION_REFORM_PRESETS = {
  corOptimiste: {
    label: "COR optimiste (1,6%)",
    description: "Croissance 1,6%, emploi 73%, fécondité 1,80",
    pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    macroOverrides: { realGrowth: 0.016 },
  },
  corCentral: {
    label: "COR central (réf. 2024)",
    description: "Croissance 1,0%, emploi 71%, fécondité 1,80",
    pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    macroOverrides: { realGrowth: 0.010 },
  },
  corPessimiste: {
    label: "COR pessimiste (réf. 2025)",
    description: "Croissance 0,7%, emploi 68,5%, fécondité 1,80, déficit 5%",
    pensionReform: { retirementAge: 64, desindexation: 0, pensionCap: 0, notionnel: false, capitalisation: 0 },
    macroOverrides: { realGrowth: 0.007 },
  },
  reformeRetraites: {
    label: "Réforme retraites",
    description: "Âge 67, notionnel, désindexation 1,5pt, plafond 15%, capitalisation 10%",
    pensionReform: { retirementAge: 67, desindexation: 1.5, pensionCap: 15, notionnel: true, capitalisation: 10 },
    macroOverrides: null,
  },
  reformeGlobale: {
    label: "Réforme globale",
    description: "Réforme retraites + économique combinée",
    pensionReform: { retirementAge: 67, desindexation: 1.5, pensionCap: 15, notionnel: true, capitalisation: 10 },
    macroOverrides: { realGrowth: 0.016 },
  },
}

// =============================================================================
// BEHAVIORAL RESPONSE PARAMETERS (ETI-calibrated)
// =============================================================================
// Sources: Dynamic assumptions.txt Modules 2 (ETI) and 3 (emigration)
//
// increaseEfficiency: fraction of static revenue that materialises for rate increases
// decreaseEfficiency: multiplier for cuts (modest supply-side boost to revenue)
// growthDragPerPp: pp nominal growth drag per 1pp rate INCREASE (negative)

export const BEHAVIORAL_RESPONSE = {
  incomeTax: {
    increaseEfficiency: 0.70,  // ETI top-10% 0.25, top-1% 0.55; France ≈54% combined marginal
    decreaseEfficiency: 1.05,
    growthDragPerPp:   -0.0012, // semi-elasticity migration 0.17 (Module 3)
    growthBoostPerPp:   0.0008, // 67% of drag; Romer & Romer (2010), Kleven et al. (2014)
  },
  corporateTax: {
    increaseEfficiency: 0.55,  // ETI broad capital 0.50, dividends 1.00; profit-shifting
    decreaseEfficiency: 1.10,  // investment attraction
    growthDragPerPp:   -0.0025,
    growthBoostPerPp:   0.0012, // 48% of drag; Gechert & Heimberger (2022), Mertens & Ravn (2013)
  },
  vat: {
    increaseEfficiency: 0.92,  // most efficient; consumption substitution only
    decreaseEfficiency: 1.00,
    growthDragPerPp:   -0.0004,
    growthBoostPerPp:   0.0003, // 75% of drag; consumption tax, minimal supply-side gain
  },
  csg: {
    increaseEfficiency: 0.82,  // ETI labour income weighted; broad base
    decreaseEfficiency: 1.02,
    growthDragPerPp:   -0.0008,
    growthBoostPerPp:   0.0006, // 75% of drag; Mirrlees Review (2011), Saez et al. (2012)
  },
  socialContributions: {
    increaseEfficiency: 0.58,  // France highest OECD wedge; ETI ≈0.25 at this level
    decreaseEfficiency: 1.08,  // employer cut → hiring
    growthDragPerPp:   -0.0018,
    growthBoostPerPp:   0.0020, // 111% of drag; Crépon & Desplatz (2001), France Stratégie CICE (2020)
  },
}

// =============================================================================
// FISCAL MULTIPLIERS (Module 4)
// =============================================================================
// Source: Dynamic assumptions.txt Module 4
// France 2025 output gap ≈ 0 → expansion multipliers used as default
// Note: monetary offset = 0.00 (ECB is supranational; no country-level crowding-out)

export const FISCAL_MULTIPLIERS = {
  education:   { expansion: 0.90, recession: 1.40 }, // public investment
  defense:     { expansion: 0.60, recession: 1.10 }, // government consumption
  solidarity:  { expansion: 0.40, recession: 0.90 }, // transfers
  pensions:    { expansion: 0.40, recession: 0.90 }, // transfers
  health:      { expansion: 0.70, recession: 1.00 }, // mixed
}

// =============================================================================
// ONDAM FLOOR CONSTRAINT
// =============================================================================
// Source: DREES 2024, FNAIM healthcare access data
// Health spending cuts face diminishing returns beyond -3% due to
// uncompressible demand (87% deserts medicaux, 52-day specialist waits,
// 20.8M emergency visits).

export const ONDAM_FLOOR = {
  threshold: -3,         // % — cuts below this are damped
  dampingFactor: 0.50,   // 50% of additional cut beyond threshold materialises
  hardFloor: -7,         // % — maximum effective cut regardless of requested
}

/**
 * Apply ONDAM floor constraint to health spending cuts.
 * Cuts beyond -3% are damped by 50%; hard floor at -7%.
 *
 * @param {number} requestedCut - Requested health spending change (%)
 * @returns {{ effectiveCut: number, warning: string|null, warningLevel: string|null }}
 */
export function applyOndamFloor(requestedCut) {
  // No constraint for increases or mild cuts
  if (requestedCut >= ONDAM_FLOOR.threshold) {
    return { effectiveCut: requestedCut, warning: null, warningLevel: null }
  }

  // Damped region: only 50% of cut beyond threshold materialises
  const excess = requestedCut - ONDAM_FLOOR.threshold
  let effectiveCut = ONDAM_FLOOR.threshold + excess * ONDAM_FLOOR.dampingFactor

  // Hard floor
  if (effectiveCut < ONDAM_FLOOR.hardFloor) {
    effectiveCut = ONDAM_FLOOR.hardFloor
  }

  const warningLevel = requestedCut < -6 ? 'red' : 'yellow'
  const warning = `Coupe santé demandée ${requestedCut}% → effective ${effectiveCut.toFixed(1)}% (contrainte ONDAM : déserts médicaux, urgences saturées)`

  return { effectiveCut, warning, warningLevel }
}

// GDP reference for multiplier calculations (Md€)
const GDP_BASE = 2850  // MACRO_BASELINE.gdp

// =============================================================================
// POLICY IMPACT CALCULATION
// =============================================================================

/**
 * Calculate the fiscal impact of policy lever positions.
 *
 * @param {object} levers - Slider positions (all default to 0)
 * @returns {object} { revenueChange, spendingChange, growthEffect, etat, ss }
 */
export function calculatePolicyImpact(levers = {}) {
  const {
    incomeTaxChange = 0,
    vatChange = 0,
    corpTaxChange = 0,
    spendingEducation = 0,
    spendingDefense = 0,
    spendingSolidarity = 0,
    pensionIndexation = 0,
    healthSpending = 0,
    socialContributions = 0,
    csgRate = 0,
  } = levers

  // Helper: apply behavioral efficiency based on direction of lever
  function applyEfficiency(rawRevenue, lever, response) {
    if (lever === 0) return 0
    const efficiency = lever > 0 ? response.increaseEfficiency : response.decreaseEfficiency
    return rawRevenue * efficiency
  }

  // ÉTAT (State) revenue changes — static estimate × behavioral efficiency
  const incomeRevenueRaw = incomeTaxChange * BASELINE.etat.incomeTax / 10 * 0.9
  const vatRevenueRaw    = vatChange       * BASELINE.etat.vat         / 20 * 0.95
  const corpRevenueRaw   = corpTaxChange   * BASELINE.etat.corporateTax / 25 * 0.7

  const incomeRevenue = applyEfficiency(incomeRevenueRaw, incomeTaxChange, BEHAVIORAL_RESPONSE.incomeTax)
  const vatRevenue    = applyEfficiency(vatRevenueRaw,    vatChange,       BEHAVIORAL_RESPONSE.vat)
  const corpRevenue   = applyEfficiency(corpRevenueRaw,   corpTaxChange,   BEHAVIORAL_RESPONSE.corporateTax)

  // ÉTAT spending changes
  const educationSpending  = spendingEducation  * BASELINE.etat.education  / 100
  const defenseSpending    = spendingDefense    * BASELINE.etat.defense    / 100
  const solidaritySpending = spendingSolidarity * BASELINE.etat.solidarity / 100

  const etatRevenueChange  = incomeRevenue + vatRevenue + corpRevenue
  const etatSpendingChange = educationSpending + defenseSpending + solidaritySpending

  // SÉCURITÉ SOCIALE revenue changes — static estimate × behavioral efficiency
  const socialContribRevenueRaw = socialContributions * BASELINE.securiteSociale.cotisations / 41
  const csgRevenueRaw           = csgRate             * BASELINE.securiteSociale.csg         / 9.2

  const socialContribRevenue = applyEfficiency(socialContribRevenueRaw, socialContributions, BEHAVIORAL_RESPONSE.socialContributions)
  const csgRevenue           = applyEfficiency(csgRevenueRaw,           csgRate,             BEHAVIORAL_RESPONSE.csg)

  // SÉCURITÉ SOCIALE spending changes
  const pensionSpendingChange = pensionIndexation * BASELINE.securiteSociale.vieillesse / 100

  // Apply ONDAM floor constraint to health spending cuts
  const ondamResult = applyOndamFloor(healthSpending)
  const effectiveHealthSpending = ondamResult.effectiveCut
  const healthSpendingChange  = effectiveHealthSpending * BASELINE.securiteSociale.maladie / 100

  const ssRevenueChange  = socialContribRevenue + csgRevenue
  const ssSpendingChange = pensionSpendingChange + healthSpendingChange

  // INTEGRATED totals
  const totalRevenueChange  = etatRevenueChange  + ssRevenueChange
  const totalSpendingChange = etatSpendingChange + ssSpendingChange

  // Growth effects — behavioral tax response (drag for increases only; max(0, lever))
  const incomeTaxGrowthDrag      = BEHAVIORAL_RESPONSE.incomeTax.growthDragPerPp       * Math.max(0, incomeTaxChange)
  const vatGrowthDrag            = BEHAVIORAL_RESPONSE.vat.growthDragPerPp             * Math.max(0, vatChange)
  const corpTaxGrowthDrag        = BEHAVIORAL_RESPONSE.corporateTax.growthDragPerPp    * Math.max(0, corpTaxChange)
  const csgGrowthDrag            = BEHAVIORAL_RESPONSE.csg.growthDragPerPp             * Math.max(0, csgRate)
  const socialContribGrowthDrag  = BEHAVIORAL_RESPONSE.socialContributions.growthDragPerPp * Math.max(0, socialContributions)

  // Growth effects — tax cut boosts (only for DECREASES, symmetric to drag)
  // Sources: Romer & Romer (2010), Gechert & Heimberger (2022), Crépon & Desplatz (2001)
  const incomeTaxGrowthBoost     = (BEHAVIORAL_RESPONSE.incomeTax.growthBoostPerPp || 0)           * Math.max(0, -incomeTaxChange)
  const vatGrowthBoost           = (BEHAVIORAL_RESPONSE.vat.growthBoostPerPp || 0)                 * Math.max(0, -vatChange)
  const corpTaxGrowthBoost       = (BEHAVIORAL_RESPONSE.corporateTax.growthBoostPerPp || 0)        * Math.max(0, -corpTaxChange)
  const csgGrowthBoost           = (BEHAVIORAL_RESPONSE.csg.growthBoostPerPp || 0)                 * Math.max(0, -csgRate)
  const socialContribGrowthBoost = (BEHAVIORAL_RESPONSE.socialContributions.growthBoostPerPp || 0) * Math.max(0, -socialContributions)

  // Growth effects — fiscal multipliers for spending (positive for increases, negative for cuts)
  const educationGrowthEffect  = educationSpending    / GDP_BASE * FISCAL_MULTIPLIERS.education.expansion
  const defenseGrowthEffect    = defenseSpending      / GDP_BASE * FISCAL_MULTIPLIERS.defense.expansion
  const solidarityGrowthEffect = solidaritySpending   / GDP_BASE * FISCAL_MULTIPLIERS.solidarity.expansion
  const healthGrowthEffect     = healthSpendingChange / GDP_BASE * FISCAL_MULTIPLIERS.health.expansion
  const pensionGrowthEffect    = pensionSpendingChange / GDP_BASE * FISCAL_MULTIPLIERS.pensions.expansion

  const growthEffect =
    incomeTaxGrowthDrag + vatGrowthDrag + corpTaxGrowthDrag + csgGrowthDrag + socialContribGrowthDrag +
    incomeTaxGrowthBoost + vatGrowthBoost + corpTaxGrowthBoost + csgGrowthBoost + socialContribGrowthBoost +
    educationGrowthEffect + defenseGrowthEffect + solidarityGrowthEffect + healthGrowthEffect + pensionGrowthEffect

  return {
    revenueChange: totalRevenueChange,
    spendingChange: totalSpendingChange,
    growthEffect,

    etat: {
      revenue: etatRevenueChange,
      spending: etatSpendingChange,
    },
    ss: {
      revenue: ssRevenueChange,
      spending: ssSpendingChange,
    },

    // ONDAM floor constraint feedback
    ondamWarning: ondamResult.warning,
    ondamWarningLevel: ondamResult.warningLevel,
    ondamEffectiveCut: effectiveHealthSpending,
  }
}
