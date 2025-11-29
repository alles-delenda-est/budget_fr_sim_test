/* src/components/BudgetSimulator.jsx */
/* Main budget simulator component - orchestrates all controls and results */

import { useState, useMemo, useCallback } from 'react';
import ModeToggle from './ModeToggle';
import TaxSlider from './TaxSlider';
import SpendingSlider from './SpendingSlider';
import ResultsPanel from './ResultsPanel';
import { taxConfig, spendingConfig } from '../data/budgetData';
import { 
  calculateBudget, 
  calculateTaxRevenue,
  getDefaultTaxRates, 
  getDefaultSpendingLevels 
} from '../utils/calculations';
import './BudgetSimulator.css';

function BudgetSimulator() {
  // Mode state
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  
  // Tax rates state
  const [taxRates, setTaxRates] = useState(() => getDefaultTaxRates(false));
  
  // Spending levels state
  const [spendingLevels, setSpendingLevels] = useState(() => getDefaultSpendingLevels());
  
  // Handle mode change
  const handleModeChange = useCallback((advanced) => {
    setIsAdvancedMode(advanced);
    // Reset tax rates when switching modes to avoid inconsistencies
    setTaxRates(getDefaultTaxRates(advanced));
  }, []);
  
  // Handle tax rate change
  const handleTaxChange = useCallback((taxId, newRate) => {
    setTaxRates(prev => ({
      ...prev,
      [taxId]: newRate,
    }));
  }, []);
  
  // Handle spending change
  const handleSpendingChange = useCallback((spendingId, newAmount) => {
    setSpendingLevels(prev => ({
      ...prev,
      [spendingId]: newAmount,
    }));
  }, []);
  
  // Reset all to defaults
  const handleReset = useCallback(() => {
    setTaxRates(getDefaultTaxRates(isAdvancedMode));
    setSpendingLevels(getDefaultSpendingLevels());
  }, [isAdvancedMode]);
  
  // Calculate budget based on current state
  const budget = useMemo(() => {
    return calculateBudget(taxRates, spendingLevels, isAdvancedMode);
  }, [taxRates, spendingLevels, isAdvancedMode]);
  
  // Get taxes to display based on mode
  const taxesToDisplay = useMemo(() => {
    return Object.entries(taxConfig).filter(([_, config]) => {
      if (isAdvancedMode) {
        return !config.simpleOnly;
      } else {
        return !config.advancedOnly;
      }
    });
  }, [isAdvancedMode]);
  
  return (
    <div className="budget-simulator">
      {/* Mode toggle */}
      <ModeToggle 
        isAdvanced={isAdvancedMode} 
        onToggle={handleModeChange} 
      />
      
      <div className="simulator-layout">
        {/* Controls panel */}
        <div className="controls-panel">
          {/* Tax controls */}
          <section className="control-section">
            <div className="section-header">
              <h3>Recettes Fiscales</h3>
              <button className="reset-btn" onClick={handleReset}>
                Réinitialiser
              </button>
            </div>
            
            <div className="sliders-container">
              {taxesToDisplay.map(([taxId, config]) => (
                <TaxSlider
                  key={taxId}
                  config={config}
                  value={taxRates[taxId] ?? config.baselineRate}
                  onChange={(newRate) => handleTaxChange(taxId, newRate)}
                  revenue={calculateTaxRevenue(taxId, taxRates[taxId] ?? config.baselineRate, isAdvancedMode)}
                />
              ))}
            </div>
          </section>
          
          {/* Spending controls */}
          <section className="control-section">
            <h3>Dépenses Publiques</h3>
            <p className="section-note">
              Les dépenses incompressibles (dette, pensions, etc.) ne sont pas modifiables: {' '}
              <strong>231 Md€</strong>
            </p>
            
            <div className="sliders-container">
              {Object.entries(spendingConfig).map(([spendingId, config]) => (
                <SpendingSlider
                  key={spendingId}
                  config={config}
                  value={spendingLevels[spendingId] ?? config.baseline}
                  onChange={(newAmount) => handleSpendingChange(spendingId, newAmount)}
                />
              ))}
            </div>
          </section>
        </div>
        
        {/* Results panel */}
        <div className="results-column">
          <ResultsPanel budget={budget} />
          
          {/* Methodology note */}
          <div className="methodology-note">
            <h4>Note méthodologique</h4>
            <p>
              Cette version de test utilise un <strong>modèle linéaire simplifié</strong>. 
              Les recettes sont calculées proportionnellement aux variations de taux.
            </p>
            <p>
              La version complète inclura:
            </p>
            <ul>
              <li>Élasticités comportementales (effets sur l'emploi, l'investissement)</li>
              <li>Écran des hypothèses avec paramètres ajustables</li>
              <li>Impacts distributionnels par décile de revenu</li>
              <li>Scénarios pédagogiques pré-configurés</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BudgetSimulator;
