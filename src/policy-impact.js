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
    revenuTotal: 308.4,
    incomeTax: 94.1,
    vat: 97.5,
    corporateTax: 51.3,
    otherTax: 65.5,

    spendingTotal: 444.97,
    education: 88.9,
    defense: 65.0,
    solidarity: 30.0,
    ecological: 45.0,
    otherSpending: 216.07,

    deficit: -139.0,
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

    spendingTotal: 676.9,
    // Expenditure by branch (PLFSS 2026 Annexe 3)
    maladie: 267.5,          // Branche maladie
    vieillesse: 307.5,       // Branche vieillesse
    famille: 59.4,           // Branche famille
    atmp: 18.0,              // Accidents du travail - Maladies professionnelles
    autonomie: 43.5,         // Branche autonomie

    deficit: -17.5,          // PLFSS 2026 target
  },

  // Integrated totals (État + ASSO) - excludes collectivités locales
  integrated: {
    revenuTotal: 967.8,      // 308.4 + 659.4
    spendingTotal: 1121.9,   // 444.97 + 676.9
    deficit: -156.5,         // -139.0 + (-17.5)
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
    reforms: ['laborMarket', 'planning'],
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

  // ÉTAT (State) revenue changes
  // Formula: pp_change × (revenue / effective_rate%) × elasticity
  const incomeRevenue = incomeTaxChange * BASELINE.etat.incomeTax / 10 * 0.9
  const vatRevenue = vatChange * BASELINE.etat.vat / 20 * 0.95
  const corpRevenue = corpTaxChange * BASELINE.etat.corporateTax / 25 * 0.7

  // ÉTAT spending changes
  const educationSpending = spendingEducation * BASELINE.etat.education / 100
  const defenseSpending = spendingDefense * BASELINE.etat.defense / 100
  const solidaritySpending = spendingSolidarity * BASELINE.etat.solidarity / 100

  const etatRevenueChange = incomeRevenue + vatRevenue + corpRevenue
  const etatSpendingChange = educationSpending + defenseSpending + solidaritySpending

  // SÉCURITÉ SOCIALE revenue changes
  const socialContribRevenue = socialContributions * BASELINE.securiteSociale.cotisations / 41
  const csgRevenue = csgRate * BASELINE.securiteSociale.csg / 9.2

  // SÉCURITÉ SOCIALE spending changes
  const pensionSpendingChange = pensionIndexation * BASELINE.securiteSociale.vieillesse / 100
  const healthSpendingChange = healthSpending * BASELINE.securiteSociale.maladie / 100

  const ssRevenueChange = socialContribRevenue + csgRevenue
  const ssSpendingChange = pensionSpendingChange + healthSpendingChange

  // INTEGRATED totals
  const totalRevenueChange = etatRevenueChange + ssRevenueChange
  const totalSpendingChange = etatSpendingChange + ssSpendingChange

  // Growth effects (simplified)
  const corpGrowthEffect = corpTaxChange < 0 ? Math.abs(corpTaxChange) * 0.002 : 0
  const spendingGrowthEffect = totalSpendingChange < 0 ? totalSpendingChange * 0.0001 : 0
  const socialContribGrowthEffect = socialContributions < 0 ? Math.abs(socialContributions) * 0.001 : 0
  const growthEffect = corpGrowthEffect + spendingGrowthEffect + socialContribGrowthEffect

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
  }
}
