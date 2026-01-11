import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import './App.css'

/**
 * FRENCH BUDGET SIMULATOR v1.9
 * 
 * NEW IN v1.9:
 * - Always shows integrated État + Sécurité Sociale (APU total)
 * - Added Sarah Knafo counter-budget preset
 * - Preset buttons for major political proposals
 * 
 * PEDAGOGICAL GOALS:
 * - Show complete fiscal picture (not just État)
 * - Compare major political budget proposals
 * - Demonstrate trade-offs between revenue and spending
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
  
  // Integrated totals (APU) - ALWAYS USED
  integrated: {
    revenuTotal: 967.8,      // 308.4 + 659.4
    spendingTotal: 1121.9,   // 444.97 + 676.9
    deficit: -158.4,         // -139.0 + (-19.4)
  },
}

// =============================================================================
// POLITICAL PRESETS
// =============================================================================

const PRESETS = {
  plf2025: {
    label: "PLF 2025 (Barnier)",
    description: "Budget initial présenté par Michel Barnier",
    levers: {
      // Slight tax increases
      incomeTaxChange: 0.5,
      vatChange: 0,
      corpTaxChange: 1,
      // Moderate spending restraint
      spendingEducation: -2,
      spendingDefense: 0,
      spendingSolidarity: -5,
      // SS: PLFSS 2026 measures
      pensionIndexation: -1,  // Partial gel
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
      // Tax cuts
      incomeTaxChange: -3,
      vatChange: 0,
      corpTaxChange: -5,
      // Deep spending cuts
      spendingEducation: -10,
      spendingDefense: 0,
      spendingSolidarity: -15,
      // SS: structural reforms
      pensionIndexation: -2,
      healthSpending: -8,
      socialContributions: -2,
      csgRate: 0,
    },
    reforms: ['labor', 'planning'],  // Expect growth from reforms
  },
  
  knafo: {
    label: "Sarah Knafo (RN/Reconquête)",
    description: "Contre-budget Knafo: -20 Md€ recettes, -80 Md€ dépenses",
    levers: {
      // Revenue cuts (-20 Md€ total)
      // Eliminate inheritance tax + CVAE = -20 Md€
      // Reject tax increases from PLF 2025
      incomeTaxChange: -2,   // Reject household tax increases
      vatChange: 0,
      corpTaxChange: -4,     // Reject business exceptional taxes
      
      // Spending cuts (-80 Md€ total, major items):
      // Reserve social prestations for French: -15 to -20 Md€
      spendingSolidarity: -60,  // Prestations sociales, agencies, development aid
      spendingEducation: -10,   // Admin posts, foreign students
      spendingDefense: 0,       // Not touched
      
      // SS cuts
      pensionIndexation: 0,     // Not in Knafo plan
      healthSpending: -5,       // State medical aid cuts
      socialContributions: 0,
      csgRate: 0,
    },
    reforms: [],  // No structural reforms in Knafo plan
  },
  
  nfp: {
    label: "Nouveau Front Populaire",
    description: "Budget de gauche: hausses d'impôts, augmentation des dépenses sociales",
    levers: {
      // Major tax increases on high earners
      incomeTaxChange: 5,
      vatChange: 0,
      corpTaxChange: 3,
      // Increased social spending
      spendingEducation: 10,
      spendingDefense: 0,
      spendingSolidarity: 15,
      // SS: generous indexation
      pensionIndexation: 1,  // Above inflation
      healthSpending: 5,
      socialContributions: 0,
      csgRate: 2,  // Increase CSG on capital
    },
    reforms: [],
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
  
  // Sécurité Sociale levers
  const [pensionIndexation, setPensionIndexation] = useState(0)  // pp deviation from inflation
  const [healthSpending, setHealthSpending] = useState(0)        // % change in ONDAM
  const [socialContributions, setSocialContributions] = useState(0)  // pp change
  const [csgRate, setCsgRate] = useState(0)                      // pp change
  
  // Structural reform selector - SUPPORTS MULTIPLE
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
  
  // Apply preset function
  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey]
    if (!preset) return
    
    const { levers, reforms } = preset
    
    // Apply all levers
    setIncomeTaxChange(levers.incomeTaxChange)
    setVatChange(levers.vatChange)
    setCorpTaxChange(levers.corpTaxChange)
    setSpendingEducation(levers.spendingEducation)
    setSpendingDefense(levers.spendingDefense)
    setSpendingSolidarity(levers.spendingSolidarity)
    setPensionIndexation(levers.pensionIndexation)
    setHealthSpending(levers.healthSpending)
    setSocialContributions(levers.socialContributions)
    setCsgRate(levers.csgRate)
    
    // Apply reforms
    setSelectedReforms(reforms)
  }
  
  // Political risk toggle
  const [politicalRisk, setPoliticalRisk] = useState(0)
  
  // Projection horizon
  const [projectionYears, setProjectionYears] = useState(10)
  
  // Calculate policy impacts (ALWAYS integrated now)
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
    const pensionSpendingChange = pensionIndexation * BASELINE.securiteSociale.pensions / 100
    const healthSpendingChange = healthSpending * BASELINE.securiteSociale.health / 100
    
    const ssRevenueChange = socialContribRevenue + csgRevenue
    const ssSpendingChange = pensionSpendingChange + healthSpendingChange
    
    // INTEGRATED totals (always)
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
    const reform = combinedReformEffect
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
        <h1>Simulateur Budget France v1.9</h1>
        <p className="subtitle">
          Vue intégrée État + Sécurité Sociale (APU totales) • 4 scénarios politiques
        </p>
      </header>

      <main className="main-content">
        {/* PRESET BUTTONS */}
        <section className="controls-section preset-section">
          <h2>🎯 Scénarios politiques</h2>
          <p className="section-help">
            Charger un budget politique complet (taxes + dépenses + réformes)
          </p>
          <div className="preset-grid">
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className="preset-btn"
                onClick={() => applyPreset(key)}
              >
                <strong>{preset.label}</strong>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>
          <div className="preset-note">
            💡 Les boutons ci-dessus configurent tous les leviers automatiquement
          </div>
        </section>

        {/* TAX LEVERS */}
        <section className="controls-section">
          <h2>💶 Leviers fiscaux (État)</h2>
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

        {/* SPENDING LEVERS (État) */}
        <section className="controls-section">
          <h2>📊 Dépenses publiques (État)</h2>
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
              min={-15}
              max={15}
              step={1}
              unit="%"
            />
            <SliderControl
              label="Solidarité & insertion"
              value={spendingSolidarity}
              onChange={setSpendingSolidarity}
              min={-30}
              max={30}
              step={1}
              unit="%"
            />
          </div>
        </section>

        {/* SOCIAL SECURITY CONTROLS */}
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
            />

            {/* CSG */}
            <SliderControl
              label="CSG (Contribution Sociale Généralisée)"
              value={csgRate}
              onChange={setCsgRate}
              min={-2}
              max={2}
              step={0.5}
              unit="pp"
            />
          </div>

          {/* PLFSS Context */}
          <div className="ss-context">
            <h4>📋 Contexte PLFSS 2026 :</h4>
            <ul>
              <li><strong>Déficit prévu :</strong> -19.4 Md€ (vs -17.5 Md€ initial)</li>
              <li><strong>ONDAM :</strong> 274.4 Md€ (+3.1%, vs +1.6% initial)</li>
              <li><strong>CSG capital :</strong> +1.5 Md€ (9.2% → 10.6%)</li>
              <li><strong>Mesures abandonnées :</strong> Gel retraites, franchises médicales (-2.3 Md€)</li>
            </ul>
          </div>
        </section>

        {/* STRUCTURAL REFORMS */}
        <section className="controls-section">
          <h2>🔧 Réformes structurelles</h2>
          <p className="section-help">
            Sélectionner plusieurs réformes (effet cumulatif avec pénalité de 15% pour chevauchements)
          </p>
          
          <div className="reform-checkboxes">
            {Object.entries(STRUCTURAL_REFORMS).map(([key, reform]) => (
              <label key={key} className="reform-checkbox-label">
                <input
                  type="checkbox"
                  checked={selectedReforms.includes(key)}
                  onChange={() => toggleReform(key)}
                />
                <div className="reform-checkbox-content">
                  <strong>{reform.label}</strong>
                  <span className="reform-effect">+{(reform.growthEffect * 100).toFixed(2)}pp/an</span>
                  <span className="reform-details">
                    Délai: {reform.lag} ans • Durée: {reform.duration} ans
                  </span>
                </div>
              </label>
            ))}
          </div>

          {selectedReforms.length > 0 && (
            <div className="combined-reforms-summary">
              <h4>Réformes sélectionnées :</h4>
              <ul className="combined-reforms-list">
                {combinedReformEffect.reforms.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
              <div className="combined-effect">
                <strong>Effet croissance combiné :</strong> +{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an
                <br />
                <small>
                  (délai min: {combinedReformEffect.lag} ans, durée max: {combinedReformEffect.duration} ans)
                </small>
              </div>
            </div>
          )}
        </section>

        {/* ADVANCED SETTINGS */}
        <section className="controls-section">
          <h2>⚙️ Paramètres avancés</h2>
          <div className="controls-grid">
            <SliderControl
              label="Prime de risque politique"
              value={politicalRisk}
              onChange={setPoliticalRisk}
              min={0}
              max={200}
              step={10}
              unit="bps"
              help="Augmentation des taux d'intérêt due à l'instabilité politique"
            />
            <SliderControl
              label="Horizon de projection"
              value={projectionYears}
              onChange={setProjectionYears}
              min={5}
              max={20}
              step={1}
              unit="ans"
            />
          </div>
        </section>

        {/* ===================================================================
            RESULTS SECTION
        =================================================================== */}
        
        {/* 10-YEAR DEBT PROJECTION CHART (TOP) */}
        <section className="results-section">
          <h2>📈 Trajectoire dette publique sur {projectionYears} ans</h2>
          <div className="chart-container primary-chart">
            <ResponsiveContainer width="100%" height={450}>
              <LineChart data={projections.fullScenario}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis 
                  label={{ value: 'Dette/PIB (%)', angle: -90, position: 'insideLeft' }}
                  domain={[60, 140]}
                />
                <Tooltip />
                <Legend />
                
                {/* Reference lines for Maastricht */}
                <ReferenceLine y={60} stroke="green" strokeDasharray="3 3" label="Critère Maastricht (60%)" />
                <ReferenceLine y={100} stroke="orange" strokeDasharray="3 3" label="Seuil alerte (100%)" />
                
                {/* Scenarios */}
                <Line 
                  type="monotone" 
                  dataKey="debtToGDP" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  name="Scénario complet"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="baseline" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Baseline (PLF 2025)"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="chart-context">
              Vue : <strong>APU totales (État + Sécurité Sociale)</strong>
            </p>
          </div>
        </section>

        {/* KEY METRICS */}
        <section className="results-section">
          <h2>📊 Indicateurs clés (Année 1)</h2>
          <div className="metrics-grid">
            <MetricCard
              label="Déficit année 1"
              value={projections.fullScenario[0].deficit}
              unit="Md€"
              baseline={BASELINE.integrated.deficit}
              format="billions"
            />
            <MetricCard
              label="Dette/PIB année 1"
              value={projections.fullScenario[0].debtToGDP}
              unit="%"
              baseline={projections.baseline[0].debtToGDP}
              format="percent"
            />
            <MetricCard
              label="Taux d'intérêt"
              value={projections.fullScenario[0].interestRate * 100}
              unit="%"
              baseline={projections.baseline[0].interestRate * 100}
              format="percent"
              decimals={2}
            />
            <MetricCard
              label="Croissance réelle"
              value={projections.fullScenario[0].realGrowth * 100}
              unit="%"
              baseline={MACRO_BASELINE.realGrowth * 100}
              format="percent"
              decimals={2}
            />
          </div>
          
          {/* Budget Breakdown */}
          <div className="budget-breakdown">
            <h3>Décomposition du déficit (Année 1)</h3>
            <div className="breakdown-row">
              <span>État seul :</span>
              <span className="breakdown-value">
                {(BASELINE.etat.deficit + policyImpact.etat.revenue - policyImpact.etat.spending).toFixed(1)} Md€
              </span>
            </div>
            <div className="breakdown-row">
              <span>Sécurité sociale :</span>
              <span className="breakdown-value">
                {(BASELINE.securiteSociale.deficit + policyImpact.ss.revenue - policyImpact.ss.spending).toFixed(1)} Md€
              </span>
            </div>
            <div className="breakdown-row total">
              <span><strong>Total APU :</strong></span>
              <span className="breakdown-value">
                <strong>{projections.fullScenario[0].deficit.toFixed(1)} Md€</strong>
              </span>
            </div>
          </div>
        </section>

        {/* POLICY IMPACT CHART */}
        {(policyImpact.revenueChange !== 0 || policyImpact.spendingChange !== 0) && (
          <section className="results-section">
            <h2>💡 Impact des leviers budgétaires</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[{
                  name: 'Impact',
                  'Recettes': policyImpact.revenueChange,
                  'Dépenses': -policyImpact.spendingChange,
                  'Solde': policyImpact.revenueChange - policyImpact.spendingChange,
                }]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Milliards €', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Recettes" fill="#10b981" />
                  <Bar dataKey="Dépenses" fill="#ef4444" />
                  <Bar dataKey="Solde" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {selectedReforms.length > 0 && (
              <div className="reform-impact-note">
                <p>
                  ✓ <strong>{selectedReforms.length} réforme(s) structurelle(s)</strong> activée(s)
                  avec effet croissance de <strong>+{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an</strong>
                </p>
                <p className="reform-list">
                  {combinedReformEffect.reforms.join(' • ')}
                </p>
              </div>
            )}
          </section>
        )}

        {/* DOOM LOOP ASSESSMENT */}
        {doomLoopAssessment.isAtRisk && (
          <section className="results-section warning-section">
            <h2>⚠️ Alerte : Risque de "Doom Loop"</h2>
            <div className="doom-loop-warning">
              <p><strong>{doomLoopAssessment.message}</strong></p>
              <ul>
                {doomLoopAssessment.indicators.map((indicator, i) => (
                  <li key={i}>{indicator}</li>
                ))}
              </ul>
              <p className="doom-loop-explanation">
                Un "doom loop" se produit quand la dette élevée augmente les taux d'intérêt,
                ce qui augmente la dette, créant un cercle vicieux.
              </p>
            </div>
          </section>
        )}

        {/* VALIDATION WARNINGS */}
        {!validation.isValid && (
          <section className="results-section validation-section">
            <h2>⚠️ Avertissements de validation</h2>
            <ul className="validation-warnings">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Simulateur Budget France v1.9 (Intégré) • Sources : PLF 2025, PLFSS 2026, Knafo, IMF, OECD, ECB</p>
        <p className="footer-note">
          Vue consolidée État + Sécurité Sociale (APU totales). 
          Modèle pédagogique avec paramètres exposés.
        </p>
      </footer>
    </div>
  )
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function SliderControl({ label, value, onChange, min, max, step, unit, help, decimals = 0 }) {
  return (
    <div className="control">
      <div className="control-header">
        <label>{label}</label>
        <span className="control-value">
          {value.toFixed(decimals)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
      />
      {help && <p className="control-help">{help}</p>}
    </div>
  )
}

function MetricCard({ label, value, unit, baseline, format, decimals = 1 }) {
  const delta = value - baseline
  const deltaPercent = baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : 0
  
  let deltaClass = 'neutral'
  if (format === 'billions') {
    // For deficit: negative is good (less deficit)
    deltaClass = delta < 0 ? 'positive' : (delta > 0 ? 'negative' : 'neutral')
  } else if (format === 'percent') {
    // For debt/GDP: lower is better
    deltaClass = delta < 0 ? 'positive' : (delta > 0 ? 'negative' : 'neutral')
  }
  
  return (
    <div className="metric-card">
      <h3>{label}</h3>
      <div className="metric-value">
        {value.toFixed(decimals)} {unit}
      </div>
      <div className={`metric-delta ${deltaClass}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(decimals)} {unit}
        <span className="delta-percent">
          ({delta > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
        </span>
      </div>
    </div>
  )
}

export default App
