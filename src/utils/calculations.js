/* src/utils/calculations.js */
/* French Budget Simulator - Calculation Logic */

import { taxConfig, spendingConfig, TOTAL_FIXED_SPENDING, GDP_BASELINE } from '../data/budgetData';

/**
 * Calculate tax revenue based on rate change from baseline
 * 
 * This is a simplified LINEAR model for the test version.
 * The full version will use pre-computed interpolation grids
 * and elasticity-based behavioral adjustments.
 * 
 * @param {string} taxId - The tax identifier
 * @param {number} newRate - The new tax rate
 * @param {boolean} isAdvancedMode - Whether advanced mode is active
 * @returns {number} - Revenue in billions of euros
 */
export const calculateTaxRevenue = (taxId, newRate, isAdvancedMode = false) => {
  const tax = taxConfig[taxId];
  if (!tax) {
    console.warn(`Unknown tax: ${taxId}`);
    return 0;
  }
  
  // Calculate rate change from baseline (in percentage points)
  const rateChange = newRate - tax.baselineRate;
  
  // Simple linear model: Revenue = Baseline + (Change × RevenuePerPoint × 100)
  // The ×100 converts from decimal (0.01) to percentage points (1%)
  const revenue = tax.baselineRevenue + (rateChange * tax.revenuePerPoint * 100);
  
  // Ensure revenue doesn't go negative (floor at 0)
  return Math.max(0, revenue);
};

/**
 * Calculate total revenue from all tax rates
 * 
 * @param {Object} taxRates - Object with taxId: rate pairs
 * @param {boolean} isAdvancedMode - Whether to use split employer contributions
 * @returns {Object} - Breakdown and total revenue
 */
export const calculateTotalRevenue = (taxRates, isAdvancedMode = false) => {
  const breakdown = {};
  let total = 0;
  
  // Determine which taxes to calculate based on mode
  const taxesToCalculate = Object.keys(taxConfig).filter(taxId => {
    const tax = taxConfig[taxId];
    if (isAdvancedMode) {
      // In advanced mode, skip the aggregated version
      return !tax.simpleOnly;
    } else {
      // In simple mode, skip the split versions
      return !tax.advancedOnly;
    }
  });
  
  taxesToCalculate.forEach(taxId => {
    const rate = taxRates[taxId] ?? taxConfig[taxId].baselineRate;
    const revenue = calculateTaxRevenue(taxId, rate, isAdvancedMode);
    breakdown[taxId] = revenue;
    total += revenue;
  });
  
  return { breakdown, total };
};

/**
 * Calculate total adjustable spending
 * 
 * @param {Object} spendingLevels - Object with spendingId: amount pairs
 * @returns {Object} - Breakdown and total spending
 */
export const calculateTotalSpending = (spendingLevels) => {
  const breakdown = {};
  let adjustableTotal = 0;
  
  Object.keys(spendingConfig).forEach(spendingId => {
    const amount = spendingLevels[spendingId] ?? spendingConfig[spendingId].baseline;
    breakdown[spendingId] = amount;
    adjustableTotal += amount;
  });
  
  // Add fixed spending that user cannot change
  const total = adjustableTotal + TOTAL_FIXED_SPENDING;
  
  return {
    breakdown,
    adjustableTotal,
    fixedTotal: TOTAL_FIXED_SPENDING,
    total,
  };
};

/**
 * Calculate the full budget balance
 * 
 * @param {Object} taxRates - Current tax rates
 * @param {Object} spendingLevels - Current spending levels
 * @param {boolean} isAdvancedMode - Whether advanced mode is active
 * @returns {Object} - Complete budget calculation
 */
export const calculateBudget = (taxRates, spendingLevels, isAdvancedMode = false) => {
  const revenue = calculateTotalRevenue(taxRates, isAdvancedMode);
  const spending = calculateTotalSpending(spendingLevels);
  
  const deficit = revenue.total - spending.total;
  const deficitPercentGDP = (deficit / GDP_BASELINE) * 100;
  
  // Calculate changes from baseline
  const baselineDeficit = calculateBaselineDeficit();
  const deficitChange = deficit - baselineDeficit;
  
  return {
    revenue,
    spending,
    deficit,
    deficitPercentGDP,
    baselineDeficit,
    deficitChange,
    gdp: GDP_BASELINE,
  };
};

/**
 * Calculate baseline deficit (for comparison)
 */
const calculateBaselineDeficit = () => {
  const baselineRevenue = ['tva', 'ir', 'is', 'cotisationsPatronales']
    .reduce((sum, taxId) => sum + taxConfig[taxId].baselineRevenue, 0);
  
  const baselineAdjustableSpending = Object.values(spendingConfig)
    .reduce((sum, item) => sum + item.baseline, 0);
  
  const baselineSpending = baselineAdjustableSpending + TOTAL_FIXED_SPENDING;
  
  return baselineRevenue - baselineSpending;
};

/**
 * Get default tax rates (baseline values)
 */
export const getDefaultTaxRates = (isAdvancedMode = false) => {
  const defaults = {};
  
  Object.entries(taxConfig).forEach(([taxId, tax]) => {
    if (isAdvancedMode) {
      if (!tax.simpleOnly) {
        defaults[taxId] = tax.baselineRate;
      }
    } else {
      if (!tax.advancedOnly) {
        defaults[taxId] = tax.baselineRate;
      }
    }
  });
  
  return defaults;
};

/**
 * Get default spending levels (baseline values)
 */
export const getDefaultSpendingLevels = () => {
  const defaults = {};
  
  Object.entries(spendingConfig).forEach(([spendingId, config]) => {
    defaults[spendingId] = config.baseline;
  });
  
  return defaults;
};

/**
 * Format number for display
 */
export const formatNumber = (value, type = 'billions') => {
  switch (type) {
    case 'billions':
      return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value) + ' Md€';
    
    case 'percent':
      return new Intl.NumberFormat('fr-FR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
    
    case 'gdp':
      const sign = value >= 0 ? '+' : '';
      return sign + value.toFixed(1) + '% PIB';
    
    default:
      return value.toString();
  }
};
