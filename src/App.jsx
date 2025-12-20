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
// INTEGRATED BASELINE DATA - PLF 2025 + PLFSS 2026
// =============================================================================

const BASELINE = {
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
  
  // Sécurité Sociale (PLFSS 2026)
  securiteSociale: {
    revenuTotal: 659.4,
    cotisations: 450.0,      // Social contributions
    csg: 150.0,              // CSG (all sources)
    tva: 28.0,               // État contribution
    otherRevenue: 31.4,
    
    spendingTotal: 676.9,
    pensions: 291.0,         // Vieillesse
    health: 251.0,           // Maladie (ONDAM)
    family: 57.5,            // Famille
    autonomy: 43.6,          // Autonomie
    other: 33.8,             // FSV + AT-MP
    
    deficit: -19.4,
  },
  
  // Integrated totals (APU)
  integrated: {
    revenuTotal: 967.8,      // 308.4 + 659.4
    spendingTotal: 1121.9,   // 444.97 + 676.9
    deficit: -158.4,         // -139.0 + (-19.4)
  },
}

// =============================================================================
// MAIN APP COMPONENT
// =============================================================================

function App() {
  // État (State) policy levers
  const [incomeTaxChange, setIncomeTaxChange] = useState(0)
  const [vatChange, setVatChange] = useState(0)
  const [corpTaxChange, setCorpTaxChange] = useState(0)
  const [spendingEducation, setSpendingEducation] = useState(0)
  const [spendingDefense, setSpendingDefense] = useState(0)
  const [spendingSolidarity, setSpendingSolidarity] = useState(0)
  
  // NEW: Sécurité Sociale levers
  const [pensionIndexation, setPensionIndexation] = useState(0)  // pp deviation from inflation
  const [healthSpending, setHealthSpending] = useState(0)        // % change in ONDAM
  const [socialContributions, setSocialContributions] = useState(0)  // pp change
  const [csgRate, setCsgRate] = useState(0)                      // pp change
  
  // NEW: View toggle
  const [showIntegrated, setShowIntegrated] = useState(true)  // true = APU total, false = État seul
  
  // Structural reform selector - NOW SUPPORTS MULTIPLE
  const [selectedReforms, setSelectedReforms] = useState([])  // Array of reform keys
  
  // Calculate combined reform effect
  const combinedReformEffect = useMemo(() => {
    if (selectedReforms.length === 0) return null
    
    // Sum growth effects (with diminishing returns for overlap)
    const totalGrowthEffect = selectedReforms.reduce((sum, key) => {
      return sum + STRUCTURAL_REFORMS[key].growthEffect
    }, 0) * 0.85  // 15% overlap penalty when combining
    
    return {
      label: `${selectedReforms.length} réformes combinées`,
      growthEffect: totalGrowthEffect,
      lag: Math.min(...selectedReforms.map(k => STRUCTURAL_REFORMS[k].lag)),
      duration: Math.max(...selectedReforms.map(k => STRUCTURAL_REFORMS[k].duration)),
      source: "Combinaison personnalisée",
      confidence: "variable",
      reforms: selectedReforms.map(k => STRUCTURAL_REFORMS[k].label),
    }
  }, [selectedReforms])
  
  // Toggle reform selection
  const toggleReform = (reformKey) => {
    setSelectedReforms(prev => 
      prev.includes(reformKey)
        ? prev.filter(k => k !== reformKey)
        : [...prev, reformKey]
    )
  }
  
  // Political risk toggle
  const [politicalRisk, setPoliticalRisk] = useState(0)
  
  // Projection horizon
  const [projectionYears, setProjectionYears] = useState(10)
  
  // Calculate policy impacts
  const policyImpact = useMemo(() => {
    // ÉTAT (State) revenue changes
    const incomeRevenue = incomeTaxChange * BASELINE.etat.incomeTax * 0.9
    const vatRevenue = vatChange * BASELINE.etat.vat * 0.95
    const corpRevenue = corpTaxChange * BASELINE.etat.corporateTax * 0.7
    
    // ÉTAT spending changes
    const educationSpending = spendingEducation * BASELINE.etat.education / 100
    const defenseSpending = spendingDefense * BASELINE.etat.defense / 100
    const solidaritySpending = spendingSolidarity * BASELINE.etat.solidarity / 100
    
    const etatRevenueChange = incomeRevenue + vatRevenue + corpRevenue
    const etatSpendingChange = educationSpending + defenseSpending + solidaritySpending
    
    // SÉCURITÉ SOCIALE revenue changes
    const socialContribRevenue = socialContributions * BASELINE.securiteSociale.cotisations / 100
    const csgRevenue = csgRate * BASELINE.securiteSociale.csg / 100
    
    // SÉCURITÉ SOCIALE spending changes
    // Pension indexation: Each 1pp below inflation saves money
    // Baseline: pensions revalued at inflation (1.8%)
    // If pensionIndexation = -1pp, actual revaluation = 0.8%, saving = -1pp * 291 Md€ = ~2.9 Md€
    const pensionSpendingChange = pensionIndexation * BASELINE.securiteSociale.pensions / 100
    
    // Health spending (ONDAM): % change
    const healthSpendingChange = healthSpending * BASELINE.securiteSociale.health / 100
    
    const ssRevenueChange = socialContribRevenue + csgRevenue
    const ssSpendingChange = pensionSpendingChange + healthSpendingChange
    
    // INTEGRATED totals
    const totalRevenueChange = showIntegrated 
      ? etatRevenueChange + ssRevenueChange
      : etatRevenueChange
    
    const totalSpendingChange = showIntegrated
      ? etatSpendingChange + ssSpendingChange
      : etatSpendingChange
    
    // Growth effects (simplified)
    const corpGrowthEffect = corpTaxChange < 0 ? Math.abs(corpTaxChange) * 0.002 : 0
    const spendingGrowthEffect = totalSpendingChange < 0 ? totalSpendingChange * 0.0001 : 0
    const socialContribGrowthEffect = socialContributions < 0 ? Math.abs(socialContributions) * 0.001 : 0
    const growthEffect = corpGrowthEffect + spendingGrowthEffect + socialContribGrowthEffect
    
    return {
      revenueChange: totalRevenueChange,
      spendingChange: totalSpendingChange,
      growthEffect,
      
      // For display breakdown
      etat: {
        revenue: etatRevenueChange,
        spending: etatSpendingChange,
      },
      ss: {
        revenue: ssRevenueChange,
        spending: ssSpendingChange,
      },
    }
  }, [
    incomeTaxChange, vatChange, corpTaxChange,
    spendingEducation, spendingDefense, spendingSolidarity,
    pensionIndexation, healthSpending, socialContributions, csgRate,
    showIntegrated,
  ])
  
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
    const reform = combinedReformEffect  // Now uses combined effect from multiple reforms
    const fullScenario = projectFiscalPath(policyImpact, {
      years: projectionYears,
      enableRiskPremium: true,
      politicalRiskPremium: politicalRisk / 10000,
      structuralReform: reform,
    })
    
    return { baseline, policyScenario, fullScenario }
  }, [policyImpact, projectionYears, selectedReforms, politicalRisk, combinedReformEffect])
  
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

        {/* NEW: VIEW TOGGLE - État seul vs APU total */}
        <section className="controls-section view-toggle-section">
          <h2>🔀 Périmètre budgétaire</h2>
          <p className="section-help">
            Choisir entre budget de l'État seul (PLF) ou Administrations Publiques totales (PLF + PLFSS)
          </p>
          <div className="view-toggle-buttons">
            <button
              className={`view-btn ${!showIntegrated ? 'active' : ''}`}
              onClick={() => setShowIntegrated(false)}
            >
              <strong>État seul</strong>
              <span className="view-amount">{BASELINE.etat.spendingTotal} Md€</span>
              <span className="view-desc">Budget général uniquement</span>
            </button>
            <button
              className={`view-btn ${showIntegrated ? 'active' : ''}`}
              onClick={() => setShowIntegrated(true)}
            >
              <strong>APU total (État + Sécu)</strong>
              <span className="view-amount">{BASELINE.integrated.spendingTotal} Md€</span>
              <span className="view-desc">Vue consolidée PLF + PLFSS</span>
            </button>
          </div>
          {showIntegrated && (
            <div className="integration-note">
              <p><strong>✓ Mode intégré activé</strong></p>
              <p>
                Les leviers de sécurité sociale ci-dessous sont maintenant actifs.
                Déficit total = État ({BASELINE.etat.deficit} Md€) + Sécu ({BASELINE.securiteSociale.deficit} Md€) = {BASELINE.integrated.deficit} Md€
              </p>
            </div>
          )}
        </section>

        {/* NEW: SOCIAL SECURITY CONTROLS (only shown in integrated view) */}
        {showIntegrated && (
          <>
            <section className="controls-section ss-section">
              <h2>💰 Leviers Sécurité Sociale (PLFSS 2026)</h2>
              <p className="section-help">
                Ajustements des recettes et dépenses de la sécurité sociale
              </p>
              
              <div className="controls-grid">
                {/* Pension Indexation */}
                <div className="control-with-refs">
                  <SliderControl
                    label="Indexation retraites"
                    value={pensionIndexation}
                    onChange={setPensionIndexation}
                    min={-2}
                    max={1}
                    step={0.1}
                    unit="pp vs inflation"
                    decimals={1}
                  />
                  <div className="policy-refs">
                    <h4>Références politiques :</h4>
                    <div className="ref-item">
                      <strong>PLFSS 2025:</strong> Gel Jan→Jul = -3.6 Md€
                    </div>
                    <div className="ref-item">
                      <strong>PLFSS 2026:</strong> Gel total = -2.9 Md€
                    </div>
                    <div className="ref-item">
                      <strong>Génération Libre:</strong> [À compléter]
                    </div>
                  </div>
                </div>

                {/* Health Spending (ONDAM) */}
                <SliderControl
                  label="Dépenses santé (ONDAM)"
                  value={healthSpending}
                  onChange={setHealthSpending}
                  min={-10}
                  max={10}
                  step={1}
                  unit="%"
                />

                {/* Social Contributions */}
                <SliderControl
                  label="Cotisations sociales"
                  value={socialContributions}
                  onChange={setSocialContributions}
                  min={-5}
                  max={5}
                  step={0.5}
                  unit="pp"
                  decimals={1}
                />

                {/* CSG */}
                <SliderControl
                  label="CSG (tous revenus)"
                  value={csgRate}
                  onChange={setCsgRate}
                  min={-2}
                  max={2}
                  step={0.1}
                  unit="pp"
                  decimals={1}
                />
              </div>

              <div className="ss-context">
                <h4>📊 Contexte PLFSS 2026</h4>
                <ul>
                  <li><strong>Déficit initial:</strong> -17.5 Md€ (projet) → -19.4 Md€ (définitif)</li>
                  <li><strong>ONDAM 2026:</strong> 274.4 Md€ (+3.1% vs +1.6% initialement prévu)</li>
                  <li><strong>CSG capital:</strong> Hausse de 9.2% → 10.6% (+1.5 Md€)</li>
                  <li><strong>Économies abandonnées:</strong> Franchises médicales, ALD (-8 Md€ non réalisés)</li>
                </ul>
              </div>
            </section>
          </>
        )}

        {/* STRUCTURAL REFORMS SELECTOR - NOW WITH CHECKBOXES */}
        <section className="controls-section reform-section">
          <h2>🔧 Réformes structurelles (sélection multiple)</h2>
          <p className="section-help">
            Sélectionnez une ou plusieurs réformes. Les effets se cumulent avec pénalité de 15% pour chevauchement.
          </p>
          
          <div className="reform-checkboxes">
            <div className="reform-category">
              <h4>Réformes individuelles</h4>
              {['laborMarket', 'productMarketRegulation', 'planning', 'education', 'energy'].map(key => (
                <label key={key} className="reform-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedReforms.includes(key)}
                    onChange={() => toggleReform(key)}
                  />
                  <span className="reform-checkbox-text">
                    <strong>{STRUCTURAL_REFORMS[key].label}</strong>
                    <span className="reform-effect">+{(STRUCTURAL_REFORMS[key].growthEffect * 100).toFixed(2)} pp/an</span>
                  </span>
                </label>
              ))}
            </div>
            
            <div className="reform-category">
              <h4>Scénarios combinés (pré-configurés)</h4>
              {['ambitious', 'modest'].map(key => (
                <label key={key} className="reform-checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedReforms.includes(key)}
                    onChange={() => toggleReform(key)}
                  />
                  <span className="reform-checkbox-text">
                    <strong>{STRUCTURAL_REFORMS[key].label}</strong>
                    <span className="reform-effect">+{(STRUCTURAL_REFORMS[key].growthEffect * 100).toFixed(2)} pp/an</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          
          {combinedReformEffect && (
            <div className="reform-info">
              <h4>{combinedReformEffect.label}</h4>
              <div className="combined-reforms-list">
                <strong>Réformes sélectionnées:</strong>
                <ul>
                  {combinedReformEffect.reforms.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
              </div>
              <div className="reform-specs">
                <span className="spec">
                  <strong>Effet total:</strong> +{(combinedReformEffect.growthEffect * 100).toFixed(2)} pp/an
                  {selectedReforms.length > 1 && " (avec pénalité 15% chevauchement)"}
                </span>
                <span className="spec">
                  <strong>Délai minimal:</strong> {combinedReformEffect.lag} ans
                </span>
                <span className="spec">
                  <strong>Durée maximale:</strong> {combinedReformEffect.duration} ans
                </span>
              </div>
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

        {/* DEBT TRAJECTORY CHART - MOVED TO TOP */}
        <section className="chart-section primary-chart">
          <h2>📈 Évolution de la dette publique (projection {projectionYears} ans)</h2>
          <p className="chart-help">
            {showIntegrated 
              ? "Vue consolidée État + Sécurité Sociale (APU - Administrations Publiques)"
              : "État uniquement (Budget général)"}
          </p>
          <ResponsiveContainer width="100%" height={450}>
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

        {/* RESULTS PANELS */}
        <section className="results-grid">
          {/* Key Metrics */}
          <div className="result-card">
            <h3>Indicateurs clés (Année {projections.fullScenario[projectionYears].year})</h3>
            {showIntegrated && (
              <div className="budget-breakdown">
                <div className="breakdown-item">
                  <span className="breakdown-label">Déficit État:</span>
                  <span className="breakdown-value">
                    {BASELINE.etat.deficit + policyImpact.etat.revenue - policyImpact.etat.spending} Md€
                  </span>
                </div>
                <div className="breakdown-item">
                  <span className="breakdown-label">Déficit Sécu:</span>
                  <span className="breakdown-value">
                    {BASELINE.securiteSociale.deficit + policyImpact.ss.revenue - policyImpact.ss.spending} Md€
                  </span>
                </div>
                <div className="breakdown-separator"></div>
              </div>
            )}
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
        {combinedReformEffect && (
          <section className="chart-section">
            <h2>🆕 Impact des réformes structurelles</h2>
            <p className="chart-help">
              Comparaison : Politique seule vs. Politique + Réforme(s) structurelle(s)
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
              Sur {projectionYears} ans, {selectedReforms.length === 1 ? 'la réforme' : `les ${selectedReforms.length} réformes sélectionnées`} <em>{combinedReformEffect.label}</em> {selectedReforms.length === 1 ? 'réduit' : 'réduisent'} la dette de{' '}
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
        <p>Simulateur Budget France v1.8B (Option A+) • Sources : PLF 2025, PLFSS 2026, IMF, OECD, ECB</p>
        <p>Vue intégrée État + Sécurité Sociale • Réformes structurelles multiples</p>
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
