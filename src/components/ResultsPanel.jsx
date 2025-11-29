/* src/components/ResultsPanel.jsx */
/* Results display with deficit calculation and chart */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { formatNumber } from '../utils/calculations';
import { TOTAL_FIXED_SPENDING } from '../data/budgetData';
import './ResultsPanel.css';

function ResultsPanel({ budget }) {
  const { revenue, spending, deficit, deficitPercentGDP, baselineDeficit, deficitChange } = budget;
  
  // Prepare chart data
  const chartData = [
    {
      name: 'Recettes',
      value: revenue.total,
      fill: '#18753c',
    },
    {
      name: 'Dépenses',
      value: spending.total,
      fill: '#c9191e',
    },
  ];
  
  // Determine deficit status
  const isDeficit = deficit < 0;
  const deficitImproved = deficitChange > 0;
  const deficitWorsened = deficitChange < 0;
  
  // Format for display
  const deficitDisplay = Math.abs(deficit);
  const deficitChangeDisplay = Math.abs(deficitChange);
  
  return (
    <div className="results-panel">
      <h3>Résultat Budgétaire</h3>
      
      {/* Main deficit display */}
      <div className={`deficit-display ${isDeficit ? 'is-deficit' : 'is-surplus'}`}>
        <div className="deficit-label">
          {isDeficit ? 'Déficit' : 'Excédent'}
        </div>
        <div className="deficit-value">
          {formatNumber(deficitDisplay, 'billions')}
        </div>
        <div className="deficit-gdp">
          {deficitPercentGDP.toFixed(1)}% du PIB
        </div>
        
        {/* Change from baseline */}
        {Math.abs(deficitChange) > 0.1 && (
          <div className={`deficit-change ${deficitImproved ? 'improved' : 'worsened'}`}>
            {deficitImproved ? '↑' : '↓'} {formatNumber(deficitChangeDisplay, 'billions')}
            {deficitImproved ? ' de mieux' : ' de plus'}
          </div>
        )}
      </div>
      
      {/* Warning for high deficit */}
      {deficitPercentGDP < -5 && (
        <div className="deficit-warning">
          ⚠️ Déficit supérieur à 5% du PIB — Zone de risque financier
        </div>
      )}
      
      {/* Chart */}
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis 
              type="number" 
              domain={[0, 'auto']}
              tickFormatter={(value) => `${value} Md€`}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={80}
            />
            <Tooltip 
              formatter={(value) => [formatNumber(value, 'billions'), '']}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Breakdown */}
      <div className="results-breakdown">
        <div className="breakdown-section">
          <h4>Recettes</h4>
          <ul>
            {Object.entries(revenue.breakdown).map(([key, value]) => (
              <li key={key}>
                <span className="breakdown-label">{formatTaxLabel(key)}</span>
                <span className="breakdown-value">{formatNumber(value, 'billions')}</span>
              </li>
            ))}
          </ul>
          <div className="breakdown-total">
            <span>Total Recettes</span>
            <span>{formatNumber(revenue.total, 'billions')}</span>
          </div>
        </div>
        
        <div className="breakdown-section">
          <h4>Dépenses</h4>
          <ul>
            {Object.entries(spending.breakdown).map(([key, value]) => (
              <li key={key}>
                <span className="breakdown-label">{formatSpendingLabel(key)}</span>
                <span className="breakdown-value">{formatNumber(value, 'billions')}</span>
              </li>
            ))}
            <li className="fixed-spending">
              <span className="breakdown-label">Dépenses incompressibles</span>
              <span className="breakdown-value">{formatNumber(TOTAL_FIXED_SPENDING, 'billions')}</span>
            </li>
          </ul>
          <div className="breakdown-total">
            <span>Total Dépenses</span>
            <span>{formatNumber(spending.total, 'billions')}</span>
          </div>
        </div>
      </div>
      
      {/* Baseline comparison */}
      <div className="baseline-comparison">
        <p>
          <strong>Référence PLF 2025:</strong> Déficit de {formatNumber(Math.abs(baselineDeficit), 'billions')} 
          ({(baselineDeficit / budget.gdp * 100).toFixed(1)}% du PIB)
        </p>
      </div>
    </div>
  );
}

// Helper functions for labels
function formatTaxLabel(key) {
  const labels = {
    tva: 'TVA',
    ir: 'Impôt sur le Revenu',
    is: 'Impôt sur les Sociétés',
    cotisationsPatronales: 'Cotisations Patronales',
    cotisationsPatronalesLow: 'Cotis. Bas Salaires',
    cotisationsPatronalesHigh: 'Cotis. Hauts Salaires',
  };
  return labels[key] || key;
}

function formatSpendingLabel(key) {
  const labels = {
    education: 'Éducation',
    defense: 'Défense',
    transfertsSociaux: 'Transferts Sociaux',
  };
  return labels[key] || key;
}

export default ResultsPanel;
