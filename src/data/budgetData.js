/* src/data/budgetData.js */
/* French Budget Simulator - Baseline Data (PLF 2025) */

// All values in billions of euros (Md€)

export const BASELINE_YEAR = 2025;
export const GDP_BASELINE = 2800; // Approximate French GDP 2025

// =============================================================================
// TAX REVENUE BASELINE
// =============================================================================

export const taxConfig = {
  tva: {
    id: 'tva',
    name: 'TVA (Taxe sur la Valeur Ajoutée)',
    shortName: 'TVA',
    description: 'La taxe sur la consommation, principale recette fiscale de l\'État',
    baselineRate: 0.20, // 20% standard rate
    minRate: 0.15,
    maxRate: 0.25,
    step: 0.005, // 0.5% increments
    baselineRevenue: 95, // Md€
    // Revenue per percentage point (simplified linear model)
    revenuePerPoint: 4.75, // ~4.75 Md€ per 1% rate change
    category: 'consumption',
    adjustability: 'high',
    tooltipFr: 'Le taux normal de TVA. Les taux réduits (5.5%, 10%) ne sont pas modifiables ici.',
  },
  
  ir: {
    id: 'ir',
    name: 'Impôt sur le Revenu',
    shortName: 'IR',
    description: 'L\'impôt progressif sur les revenus des ménages',
    baselineRate: 0.10, // Effective average rate ~10%
    minRate: 0.08,
    maxRate: 0.15,
    step: 0.005,
    baselineRevenue: 94, // Md€
    revenuePerPoint: 9.4, // ~9.4 Md€ per 1% effective rate change
    category: 'income',
    adjustability: 'high',
    tooltipFr: 'Taux effectif moyen. Le barème réel est progressif avec plusieurs tranches.',
  },
  
  is: {
    id: 'is',
    name: 'Impôt sur les Sociétés',
    shortName: 'IS',
    description: 'L\'impôt sur les bénéfices des entreprises',
    baselineRate: 0.25, // 25% rate
    minRate: 0.15,
    maxRate: 0.35,
    step: 0.01,
    baselineRevenue: 50, // Md€
    revenuePerPoint: 2.0, // ~2 Md€ per 1% rate change (accounts for some base erosion)
    category: 'corporate',
    adjustability: 'high',
    tooltipFr: 'Taux normal de l\'IS depuis 2022. Était de 33.3% avant la réforme.',
  },
  
  cotisationsPatronalesLow: {
    id: 'cotisationsPatronalesLow',
    name: 'Cotisations Patronales (≤1.6 SMIC)',
    shortName: 'Cotis. Bas Salaires',
    description: 'Cotisations employeur sur les bas salaires, zone des allègements Fillon',
    baselineRate: 0.10, // Effective rate after allègements ~10%
    minRate: 0.05,
    maxRate: 0.20,
    step: 0.01,
    baselineRevenue: 52, // Md€ (40% of total employer contributions)
    revenuePerPoint: 5.2,
    category: 'labor',
    adjustability: 'high',
    advancedOnly: true, // Only show in advanced mode
    tooltipFr: 'Taux effectif après allègements généraux. Le taux facial est ~42% mais réduit pour les bas salaires.',
    employmentSensitive: true,
    defaultElasticity: -1.0, // High employment sensitivity
  },
  
  cotisationsPatronalesHigh: {
    id: 'cotisationsPatronalesHigh',
    name: 'Cotisations Patronales (>1.6 SMIC)',
    shortName: 'Cotis. Hauts Salaires',
    description: 'Cotisations employeur sur les salaires au-dessus de 1.6 SMIC',
    baselineRate: 0.42, // Full rate ~42%
    minRate: 0.35,
    maxRate: 0.50,
    step: 0.01,
    baselineRevenue: 178, // Md€ (60% of total employer contributions)
    revenuePerPoint: 4.24,
    category: 'labor',
    adjustability: 'medium',
    advancedOnly: true,
    tooltipFr: 'Taux plein des cotisations patronales, sans allègement.',
    employmentSensitive: true,
    defaultElasticity: -0.15, // Low employment sensitivity at high wages
  },
  
  // Aggregated version for simple mode
  cotisationsPatronales: {
    id: 'cotisationsPatronales',
    name: 'Cotisations Patronales',
    shortName: 'Cotis. Patronales',
    description: 'Cotisations employeur (moyenne pondérée)',
    baselineRate: 0.267, // Weighted average
    minRate: 0.20,
    maxRate: 0.35,
    step: 0.01,
    baselineRevenue: 230, // Md€ total
    revenuePerPoint: 8.6,
    category: 'labor',
    adjustability: 'medium',
    simpleOnly: true, // Only show in simple mode
    tooltipFr: 'Moyenne des cotisations patronales tous salaires confondus.',
  },
};

// =============================================================================
// SPENDING BASELINE
// =============================================================================

export const spendingConfig = {
  education: {
    id: 'education',
    name: 'Éducation Nationale',
    shortName: 'Éducation',
    description: 'Enseignement scolaire et supérieur',
    baseline: 89, // Md€
    min: 70,
    max: 110,
    step: 1,
    category: 'services',
    adjustability: 'medium',
    percentOfTotal: 18.2,
    tooltipFr: 'Premier poste budgétaire. Inclut enseignement primaire, secondaire et supérieur.',
  },
  
  defense: {
    id: 'defense',
    name: 'Défense',
    shortName: 'Défense',
    description: 'Budget des armées et équipements militaires',
    baseline: 50, // Md€
    min: 35,
    max: 65,
    step: 1,
    category: 'sovereign',
    adjustability: 'medium',
    percentOfTotal: 10.2,
    tooltipFr: 'Engagements LPM 2024-2030. Augmentation programmée.',
  },
  
  transfertsSociaux: {
    id: 'transfertsSociaux',
    name: 'Transferts Sociaux',
    shortName: 'Transferts',
    description: 'Prestations sociales versées par l\'État (hors Sécurité Sociale)',
    baseline: 120, // Md€ - includes RSA, APL, AAH, etc.
    min: 90,
    max: 150,
    step: 1,
    category: 'social',
    adjustability: 'low',
    percentOfTotal: 24.5,
    tooltipFr: 'RSA, APL, AAH, Prime d\'activité, etc. Dépenses souvent indexées.',
  },
};

// =============================================================================
// FIXED/MANDATORY SPENDING (Not adjustable in test version)
// =============================================================================

export const fixedSpending = {
  debtService: {
    name: 'Service de la dette',
    amount: 55, // Md€
    tooltipFr: 'Intérêts sur la dette publique. Obligation constitutionnelle.',
  },
  pensions: {
    name: 'Pensions fonctionnaires',
    amount: 66, // Md€
    tooltipFr: 'Pensions des fonctionnaires (CAS Pensions). Droits acquis.',
  },
  other: {
    name: 'Autres dépenses',
    amount: 110, // Md€
    tooltipFr: 'Justice, Sécurité, Affaires étrangères, etc.',
  },
};

// Calculate total fixed spending
export const TOTAL_FIXED_SPENDING = Object.values(fixedSpending)
  .reduce((sum, item) => sum + item.amount, 0);

// =============================================================================
// CALCULATED TOTALS (Baseline)
// =============================================================================

export const calculateBaselineTotals = () => {
  const adjustableSpending = Object.values(spendingConfig)
    .reduce((sum, item) => sum + item.baseline, 0);
  
  const totalSpending = adjustableSpending + TOTAL_FIXED_SPENDING;
  
  // Use main taxes only (not the split versions)
  const mainTaxes = ['tva', 'ir', 'is', 'cotisationsPatronales'];
  const totalRevenue = mainTaxes
    .reduce((sum, key) => sum + taxConfig[key].baselineRevenue, 0);
  
  const deficit = totalRevenue - totalSpending;
  const deficitPercentGDP = (deficit / GDP_BASELINE) * 100;
  
  return {
    totalRevenue,
    adjustableSpending,
    fixedSpending: TOTAL_FIXED_SPENDING,
    totalSpending,
    deficit,
    deficitPercentGDP,
  };
};

// =============================================================================
// UI CONFIGURATION
// =============================================================================

export const uiConfig = {
  // Format large numbers in French style
  formatBillions: (value) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value) + ' Md€';
  },
  
  formatPercent: (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  },
  
  formatPercentGDP: (value) => {
    const sign = value >= 0 ? '+' : '';
    return sign + value.toFixed(1) + '% du PIB';
  },
  
  // Colors for deficit/surplus
  getDeficitColor: (deficit) => {
    if (deficit >= 0) return 'var(--surplus-green)';
    if (deficit > -100) return 'var(--warning-orange)';
    return 'var(--deficit-red)';
  },
};
