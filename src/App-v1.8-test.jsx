import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import './App.css'

/**
 * FRENCH BUDGET SIMULATOR v1.8
 * 
 * NEW FEATURES:
 * - Enhanced sovereign risk premium model
 * - Structural reform selector with policy references
 * - Interest rate evolution visualization
 * - "Doom loop" assessment
 * 
 * PEDAGOGICAL GOALS:
 * - Show how debt levels affect borrowing costs
 * - Demonstrate long-term benefits of structural reforms
 * - Illustrate fiscal-financial feedback loops
 */

// Import projection engine
import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  projectFiscalPath,
  getBaselineProjection,
  compareProjections,
  assessDoomLoop,
  validateProjection,
} from './projection-engine-v1.8'

// =============================================================================
// BASELINE DATA (unchanged from v1.7)
// =============================================================================

const BASELINE = {
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
  
  pensionSpending: 336.0,
  deficit: -139.0,
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

function App() {
  // Policy levers (existing)
  const [incomeTaxChange, setIncomeTaxChange] = useState(0)
  const [vatChange, setVatChange] = useState(0)
  const [corpTaxChange, setCorpTaxChange] = useState(0)
  const [spendingEducation, setSpendingEducation] = useState(0)
  const [spendingDefense, setSpendingDefense] = useState(0)
  const [spendingSolidarity, setSpendingSolidarity] = useState(0)
  
  // NEW: Structural reform selector
  const [selectedReform, setSelectedReform] = useState('none')
  
  // NEW: Political risk toggle (for scenarios)
  const [politicalRisk, setPoliticalRisk] = useState(0)
  
  // Projection horizon
  const [projectionYears, setProjectionYears] = useState(10)
  
  // Calculate policy impacts
  const policyImpact = useMemo(() => {
    // Revenue changes (simplified elasticities)
    const incomeRevenue = incomeTaxChange * BASELINE.incomeTax * 0.9  // ETI = 0.1
    const vatRevenue = vatChange * BASELINE.vat * 0.95                // Low evasion
    const corpRevenue = corpTaxChange * BASELINE.corporateTax * 0.7   // Profit shifting
    
    const totalRevenueChange = incomeRevenue + vatRevenue + corpRevenue
    
    // Spending changes
    const educationSpending = spendingEducation * BASELINE.education / 100
    const defenseSpending = spendingDefense * BASELINE.defense / 100
    const solidaritySpending = spendingSolidarity * BASELINE.solidarity / 100
    
    const totalSpendingChange = educationSpending + defenseSpending + solidaritySpending
    
    // Growth effects (simplified)
    const corpGrowthEffect = corpTaxChange < 0 ? Math.abs(corpTaxChange) * 0.002 : 0
    const spendingGrowthEffect = totalSpendingChange < 0 ? totalSpendingChange * 0.0001 : 0
    const growthEffect = corpGrowthEffect + spendingGrowthEffect
    
    return {
      revenueChange: totalRevenueChange,
      spendingChange: totalSpendingChange,
      growthEffect,
    }
  }, [incomeTaxChange, vatChange, corpTaxChange, spendingEducation, spendingDefense, spendingSolidarity])
  
  // Generate projections
  const projections = useMemo(() => {
    // Baseline (no policy change, no reforms)
    const baseline = getBaselineProjection(projectionYears)
    
    // Policy scenario (with current lever settings)
    const policyScenario = projectFiscalPath(policyImpact, {
      years: projectionYears,
      enableRiskPremium: true,
      politicalRiskPremium: politicalRisk / 10000,  // bps → decimal
      structuralReform: null,
    })
    
    // Policy + Reform scenario
    const reform = selectedReform !== 'none' ? STRUCTURAL_REFORMS[selectedReform] : null
    const fullScenario = projectFiscalPath(policyImpact, {
      years: projectionYears,
      enableRiskPremium: true,
      politicalRiskPremium: politicalRisk / 10000,
      structuralReform: reform,
    })
    
    return { baseline, policyScenario, fullScenario }
  }, [policyImpact, projectionYears, selectedReform, politicalRisk])
  
  // Assess doom loop risk
  const doomLoopAssessment = useMemo(() => {
    return assessDoomLoop(projections.fullScenario)
  }, [projections.fullScenario])
  
  // Validation
  const validation = useMemo(() => {
    return validateProjection(projections.fullScenario)
  }, [projections.fullScenario])
  
  return (
    <div className="app">
      <header className="header">
        <h1>Simulateur Budget France v1.8</h1>
        <p className="subtitle">
          Nouvelles fonctionnalités : Prime de risque souverain • Réformes structurelles
        </p>
      </header>

      <main className="main-content">
        {/* EXISTING TAX LEVERS */}
        <section className="controls-section">
          <h2>Leviers fiscaux</h2>
          <div className="controls-grid">
            <SliderControl
              label="Impôt sur le revenu"
              value={incomeTaxChange}
              onChange={setIncomeTaxChange}
              min={-10}
              max={10}
              step={1}
              unit="pp"
            />
            <SliderControl
              label="TVA"
              value={vatChange}
              onChange={setVatChange}
              min={-5}
              max={5}
              step={0.5}
              unit="pp"
            />
            <SliderControl
              label="Impôt sur les sociétés"
              value={corpTaxChange}
              onChange={setCorpTaxChange}
              min={-10}
              max={5}
              step={1}
              unit="pp"
            />
          </div>
        </section>

        {/* EXISTING SPENDING LEVERS */}
        <section className="controls-section">
          <h2>Dépenses publiques</h2>
          <div className="controls-grid">
            <SliderControl
              label="Enseignement scolaire"
              value={spendingEducation}
              onChange={setSpendingEducation}
              min={-20}
              max={20}
              step={1}
              unit="%"
            />
            <SliderControl
              label="Défense"
              value={spendingDefense}
              onChange={setSpendingDefense}
              min={-20}
              max={20}
              step={1}
              unit="%"
            />
            <SliderControl
              label="Solidarité"
              value={spendingSolidarity}
              onChange={setSpendingSolidarity}
              min={-20}
              max={20}
              step={1}
              unit="%"
            />
          </div>
        </section>

        {/* NEW: STRUCTURAL REFORMS SELECTOR */}
        <section className="controls-section reform-section">
          <h2>🔧 Réformes structurelles (NOUVEAU v1.8)</h2>
          <p className="section-help">
            Les réformes structurelles augmentent le potentiel de croissance sur le long terme.
            Effets progressifs avec délais de 2-5 ans.
          </p>
          
          <div className="reform-selector">
            <label htmlFor="reform-select">Sélectionner une réforme :</label>
            <select
              id="reform-select"
              value={selectedReform}
              onChange={(e) => setSelectedReform(e.target.value)}
              className="reform-select"
            >
              <option value="none">Aucune réforme</option>
              <optgroup label="Réformes individuelles">
                <option value="laborMarket">Marché du travail (+0.15 pp/an)</option>
                <option value="productMarketRegulation">Professions réglementées (+0.10 pp/an)</option>
                <option value="planning">Droit de l'urbanisme (+0.15 pp/an)</option>
                <option value="education">Formation professionnelle (+0.08 pp/an)</option>
                <option value="energy">Marché de l'énergie (+0.12 pp/an)</option>
              </optgroup>
              <optgroup label="Scénarios combinés">
                <option value="ambitious">Paquet ambitieux (+0.40 pp/an)</option>
                <option value="modest">Réformes ciblées (+0.20 pp/an)</option>
              </optgroup>
            </select>
          </div>
          
          {selectedReform !== 'none' && (
            <div className="reform-info">
              <h4>{STRUCTURAL_REFORMS[selectedReform].label}</h4>
              <p className="reform-description">
                {STRUCTURAL_REFORMS[selectedReform].description}
              </p>
              <div className="reform-specs">
                <span className="spec">
                  <strong>Effet :</strong> +{(STRUCTURAL_REFORMS[selectedReform].growthEffect * 100).toFixed(2)} pp/an
                </span>
                <span className="spec">
                  <strong>Délai :</strong> {STRUCTURAL_REFORMS[selectedReform].lag} ans
                </span>
                <span className="spec">
                  <strong>Durée pic :</strong> {STRUCTURAL_REFORMS[selectedReform].duration} ans
                </span>
                <span className="spec">
                  <strong>Source :</strong> {STRUCTURAL_REFORMS[selectedReform].source}
                </span>
              </div>
              <p className="confidence-note">
                Confiance : <strong>{STRUCTURAL_REFORMS[selectedReform].confidence}</strong>
              </p>
            </div>
          )}
        </section>

        {/* NEW: RISK PREMIUM SCENARIO */}
        <section className="controls-section">
          <h2>⚠️ Risque politique (NOUVEAU v1.8)</h2>
          <p className="section-help">
            Simule l'impact d'une crise politique sur la prime de risque souverain
            (référence : France 2024, +21 bps après dissolution)
          </p>
          <SliderControl
            label="Prime de risque politique"
            value={politicalRisk}
            onChange={setPoliticalRisk}
            min={0}
            max={50}
            step={5}
            unit="bps"
          />
        </section>

        {/* PROJECTION HORIZON */}
        <section className="controls-section">
          <h2>Horizon de projection</h2>
          <div className="horizon-selector">
            {[1, 2, 5, 10].map(y => (
              <button
                key={y}
                className={`horizon-btn ${projectionYears === y ? 'active' : ''}`}
                onClick={() => setProjectionYears(y)}
              >
                {y} an{y > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </section>

        {/* VALIDATION WARNINGS */}
        {!validation.valid && (
          <section className="warning-section">
            <h3>⚠️ Avertissements</h3>
            <ul>
              {validation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </section>
        )}

        {/* RESULTS PANELS */}
        <section className="results-grid">
          {/* Key Metrics */}
          <div className="result-card">
            <h3>Indicateurs clés (Année {projections.fullScenario[projectionYears].year})</h3>
            <div className="metrics">
              <Metric
                label="Dette publique"
                value={projections.fullScenario[projectionYears].debtRatio}
                unit="% PIB"
                baseline={projections.baseline[projectionYears].debtRatio}
              />
              <Metric
                label="Déficit public"
                value={projections.fullScenario[projectionYears].deficitRatio}
                unit="% PIB"
                baseline={projections.baseline[projectionYears].deficitRatio}
              />
              <Metric
                label="Taux d'intérêt effectif"
                value={projections.fullScenario[projectionYears].effectiveInterestRate}
                unit="%"
                baseline={projections.baseline[projectionYears].effectiveInterestRate}
                decimals={2}
              />
              <Metric
                label="Prime de risque"
                value={projections.fullScenario[projectionYears].riskPremiumBps}
                unit="bps"
                baseline={projections.baseline[projectionYears].riskPremiumBps}
              />
            </div>
          </div>

          {/* Doom Loop Assessment */}
          <div className="result-card doom-loop-card">
            <h3>🔁 Évaluation "Doom Loop"</h3>
            <div className="doom-loop-metrics">
              <div className={`severity-badge severity-${doomLoopAssessment.severity}`}>
                Sévérité : {doomLoopAssessment.severity.toUpperCase()}
              </div>
              <p className="doom-metric">
                Évolution dette : <strong>{doomLoopAssessment.debtRatioChange > 0 ? '+' : ''}{doomLoopAssessment.debtRatioChange}</strong> pp
              </p>
              <p className="doom-metric">
                Évolution intérêts/PIB : <strong>{doomLoopAssessment.interestRatioChange > 0 ? '+' : ''}{doomLoopAssessment.interestRatioChange}</strong> pp
              </p>
              <p className="doom-metric">
                Prime de risque : <strong>+{doomLoopAssessment.premiumIncreaseBps}</strong> bps
              </p>
              {doomLoopAssessment.doomLoopActive && (
                <p className="doom-warning">
                  ⚠️ Boucle dette-intérêt activée ! La hausse de la dette alimente la hausse des taux.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* DEBT TRAJECTORY CHART */}
        <section className="chart-section">
          <h2>Évolution de la dette publique</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                type="number"
                domain={[MACRO_BASELINE.year, MACRO_BASELINE.year + projectionYears]}
              />
              <YAxis
                label={{ value: 'Dette (% PIB)', angle: -90, position: 'insideLeft' }}
                domain={[80, 140]}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine y={60} stroke="#999" strokeDasharray="3 3" label="Maastricht 60%" />
              <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" label="Seuil risque 90%" />
              <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" label="Crise >120%" />
              <Line
                data={projections.baseline}
                type="monotone"
                dataKey="debtRatio"
                stroke="#94a3b8"
                strokeWidth={2}
                name="Scénario tendanciel"
                dot={false}
              />
              <Line
                data={projections.policyScenario}
                type="monotone"
                dataKey="debtRatio"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Avec leviers fiscaux"
                dot={false}
              />
              <Line
                data={projections.fullScenario}
                type="monotone"
                dataKey="debtRatio"
                stroke="#10b981"
                strokeWidth={3}
                name="Avec leviers + réformes"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* NEW: INTEREST RATE EVOLUTION CHART */}
        <section className="chart-section">
          <h2>🆕 Évolution du taux d'intérêt effectif</h2>
          <p className="chart-help">
            Le taux d'intérêt augmente avec le ratio dette/PIB selon le modèle IMF/EC (3-4 bps/pp au-delà de 60% PIB).
            Accélération non-linéaire au-delà de 120%.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="year"
                type="number"
                domain={[MACRO_BASELINE.year, MACRO_BASELINE.year + projectionYears]}
              />
              <YAxis
                label={{ value: 'Taux effectif (%)', angle: -90, position: 'insideLeft' }}
                domain={[2.5, 6]}
              />
              <Tooltip />
              <Legend />
              <ReferenceLine
                y={MACRO_BASELINE.baseInterestRate * 100}
                stroke="#999"
                strokeDasharray="3 3"
                label="Taux base 3.2%"
              />
              <Line
                data={projections.baseline}
                type="monotone"
                dataKey="effectiveInterestRate"
                stroke="#94a3b8"
                strokeWidth={2}
                name="Tendanciel"
                dot={false}
              />
              <Line
                data={projections.fullScenario}
                type="monotone"
                dataKey="effectiveInterestRate"
                stroke="#ef4444"
                strokeWidth={3}
                name="Avec politique + réformes"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* REFORM IMPACT COMPARISON */}
        {selectedReform !== 'none' && (
          <section className="chart-section">
            <h2>🆕 Impact de la réforme structurelle</h2>
            <p className="chart-help">
              Comparaison : Politique seule vs. Politique + Réforme structurelle
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[1, 2, 5, 10].map(y => {
                  const comp = compareProjections(projections.policyScenario, projections.fullScenario, [y])[0]
                  return {
                    year: `${y} an${y > 1 ? 's' : ''}`,
                    debtReduction: -comp.debtRatioDiff,  // Negative = improvement
                  }
                })}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Réduction dette (pp PIB)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="debtReduction" fill="#10b981" name="Réduction dette grâce aux réformes" />
              </BarChart>
            </ResponsiveContainer>
            <p className="reform-note">
              Sur {projectionYears} ans, la réforme <em>{STRUCTURAL_REFORMS[selectedReform].label}</em> réduit la dette de{' '}
              <strong>
                {Math.abs(compareProjections(projections.policyScenario, projections.fullScenario, [projectionYears])[0].debtRatioDiff).toFixed(1)} pp de PIB
              </strong>
              {' '}par rapport au scénario sans réforme.
            </p>
          </section>
        )}

        {/* METHODOLOGY */}
        <section className="methodology">
          <h2>📚 Méthodologie v1.8</h2>
          <div className="method-grid">
            <div className="method-card">
              <h4>Prime de risque souverain</h4>
              <ul>
                <li>Modèle par paliers (60%, 90%, 120% dette/PIB)</li>
                <li>3-4 bps/pp jusqu'à 90%, puis accélération</li>
                <li>Calibré sur spreads OAT-Bund 2010-2025</li>
                <li><em>Sources : IMF (2017), EC (2018), Kumar & Baldacci (2010)</em></li>
              </ul>
            </div>
            <div className="method-card">
              <h4>Réformes structurelles</h4>
              <ul>
                <li>Effets progressifs avec délais (2-5 ans)</li>
                <li>Pic pendant 8-15 ans selon réforme</li>
                <li>Décroissance exponentielle ensuite (demi-vie 10 ans)</li>
                <li><em>Sources : OECD (2014), IMF Article IV France (2025), BdF (2017)</em></li>
              </ul>
            </div>
            <div className="method-card">
              <h4>Boucle dette-intérêt</h4>
              <ul>
                <li>Taux d'intérêt endogène (fonction du ratio dette/PIB)</li>
                <li>Feedback automatique : dette ↑ → taux ↑ → charges ↑ → dette ↑</li>
                <li>Sévérité = part des intérêts dans le déficit</li>
                <li><em>Concept : "Doom loop" (Gros & Alcidi, CEPR 2019)</em></li>
              </ul>
            </div>
          </div>
          <p className="disclaimer">
            <strong>Avertissement pédagogique :</strong> Ce simulateur illustre des mécanismes économiques à des fins
            éducatives. Les élasticités et paramètres sont des consensus académiques avec incertitude significative.
            Ne pas utiliser pour des prévisions précises.
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>Simulateur Budget France v1.8 • Sources : PLF 2025, IMF, OECD, ECB</p>
      </footer>
    </div>
  )
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function SliderControl({ label, value, onChange, min, max, step, unit }) {
  const displayValue = step < 1 ? value.toFixed(1) : value
  const sign = value > 0 ? '+' : ''
  
  return (
    <div className="slider-control">
      <label>
        {label}: <span className="value">{sign}{displayValue} {unit}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <div className="slider-labels">
        <span>{min}</span>
        <span>0</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function Metric({ label, value, unit, baseline, decimals = 1 }) {
  const diff = value - baseline
  const diffSign = diff > 0 ? '+' : ''
  const diffColor = diff > 0 ? 'metric-worse' : 'metric-better'
  
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value.toFixed(decimals)} {unit}
      </div>
      <div className={`metric-diff ${diffColor}`}>
        {diffSign}{diff.toFixed(decimals)} vs. tendanciel
      </div>
    </div>
  )
}

export default App
