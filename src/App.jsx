import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import './App.css'

/**
 * FRENCH BUDGET SIMULATOR v2.0
 *
 * NEW IN v2.0:
 * - Behavioral tax response (ETI-calibrated, Module 2/3)
 * - Fiscal multipliers for spending (Module 4)
 * - Debt stock inertia + deficit stress premium (Module 1)
 * - Unemployment via Okun's Law
 * - 3 new charts: deficit/GDP, growth, unemployment
 * - Year-5 / Year-10 snapshot metrics
 * - Transparent assumptions tables for new parameters
 */

// Import projection engine
import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  ROLLOVER_RATE,
  DEFICIT_STRESS_THRESHOLD,
  DEFICIT_STRESS_SENSITIVITY,
  projectFiscalPath,
  getBaselineProjection,
  compareProjections,
  assessDoomLoop,
  validateProjection,
} from './projection-engine-v1.8'

// Import policy impact calculation and data
import { BASELINE, PRESETS, calculatePolicyImpact, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from './policy-impact'

// =============================================================================
// ASSUMPTIONS DATA - Academic literature and model parameters
// =============================================================================

const ASSUMPTIONS = {
  macro: [
    {
      parameter: "PIB nominal 2025",
      value: "2 850 Md€",
      impact: "Base de calcul pour tous les ratios",
      source: "PLF 2025, INSEE",
      link: "https://www.insee.fr/fr/statistiques"
    },
    {
      parameter: "Croissance nominale",
      value: "2,5%",
      impact: "0,7% réel + 1,8% inflation",
      source: "PLF 2025, Banque de France",
      link: "https://www.banque-france.fr/fr/publications-et-statistiques/publications/projections-macroeconomiques"
    },
    {
      parameter: "Taux d'intérêt moyen dette",
      value: "2,1%",
      impact: "Charge d'intérêts ~69 Md€/an",
      source: "Agence France Trésor",
      link: "https://www.aft.gouv.fr/"
    },
    {
      parameter: "Taux de chômage 2025",
      value: "7,3%",
      impact: "Base pour la loi d'Okun",
      source: "INSEE",
      link: "https://www.insee.fr/fr/statistiques"
    },
  ],
  fiscal: [
    {
      parameter: "Élasticité fiscale au PIB",
      value: "0,45",
      impact: "45% de la croissance supplémentaire devient recettes",
      source: "Girouard & André (2005), OCDE",
      link: "https://www.oecd.org/tax/public-finance/"
    },
    {
      parameter: "Élasticité IR au revenu",
      value: "0,9",
      impact: "+1pp taux IR ≈ +8,5 Md€ recettes statiques",
      source: "CPO, Rapport impôts sur le revenu",
      link: "https://www.ccomptes.fr/fr/institutions-associees/conseil-des-prelevements-obligatoires-cpo"
    },
    {
      parameter: "Élasticité IS au bénéfice",
      value: "0,7",
      impact: "Effet de base taxable (optimisation)",
      source: "DGFiP, Cour des comptes",
      link: "https://www.ccomptes.fr/"
    },
  ],
  riskPremium: [
    {
      parameter: "Prime de risque 60-90% dette/PIB",
      value: "+3 bps/pp",
      impact: "Régime normal, effet modéré",
      source: "Kumar & Baldacci (2010), FMI",
      link: "https://www.imf.org/external/pubs/ft/wp/2010/wp10184.pdf"
    },
    {
      parameter: "Prime de risque 90-120% dette/PIB",
      value: "+4 bps/pp",
      impact: "Accélération non-linéaire",
      source: "EC Debt Sustainability Monitor",
      link: "https://economy-finance.ec.europa.eu/economic-and-fiscal-governance/fiscal-sustainability_en"
    },
    {
      parameter: "Prime de risque >120% dette/PIB",
      value: "+10 bps/pp",
      impact: "Régime de crise, doom loop",
      source: "Consensus académique, OAT France 2010-2012",
      link: null
    },
    {
      parameter: "Prime déficit (>4% PIB)",
      value: "+17 bps/%",
      impact: "Prime de flux au-delà du seuil de 4%",
      source: "Module 1 — profil OAT AFT 2025",
      link: null
    },
    {
      parameter: "Taux de renouvellement dette",
      value: "12,5%/an",
      impact: "Inertie du taux moyen (≈8 ans passage complet)",
      source: "Module 1 — maturité OAT AFT 2025",
      link: null
    },
  ],
  reforms: [
    {
      parameter: "Réforme marché du travail",
      value: "+0,15 pp/an",
      impact: "Croissance potentielle sur 10 ans, délai 2 ans",
      source: "FMI Article IV France (2024)",
      link: "https://www.imf.org/en/Countries/FRA"
    },
    {
      parameter: "Déréglementation marchés (PMR)",
      value: "+0,10 pp/an",
      impact: "Productivité via concurrence, délai 2 ans",
      source: "OCDE PMR indicators",
      link: "https://www.oecd.org/economy/reform/indicators-of-product-market-regulation/"
    },
    {
      parameter: "Réforme planification urbaine",
      value: "+0,15 pp/an",
      impact: "Productivité via logement, délai 3 ans",
      source: "Hilber & Vermeulen (2016)",
      link: "https://doi.org/10.1016/j.jue.2015.11.003"
    },
    {
      parameter: "Réforme éducation/formation",
      value: "+0,08 pp/an",
      impact: "Capital humain, délai 5 ans, durée 20 ans",
      source: "OCDE Education at a Glance",
      link: "https://www.oecd.org/education/education-at-a-glance/"
    },
    {
      parameter: "Déréglementation énergie",
      value: "+0,12 pp/an",
      impact: "Compétitivité industrielle, délai 2 ans",
      source: "CRE, Commission européenne",
      link: "https://www.cre.fr/"
    },
  ],
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

  // Tab navigation
  const [activeTab, setActiveTab] = useState('simulator')

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
    return calculatePolicyImpact({
      incomeTaxChange, vatChange, corpTaxChange,
      spendingEducation, spendingDefense, spendingSolidarity,
      pensionIndexation, healthSpending, socialContributions, csgRate,
    })
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

    // Merge baseline fields into fullScenario for chart comparison
    const chartData = fullScenario.map((item, i) => ({
      ...item,
      baselineDebtRatio: baseline[i]?.debtRatio,
      baselineDeficitRatio: baseline[i]?.deficitRatio,
      baselineNominalGrowthRate: baseline[i]?.nominalGrowthRate,
      baselineUnemploymentRate: baseline[i]?.unemploymentRate,
    }))

    return { baseline, policyScenario, fullScenario, chartData }
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
        <h1>Simulateur Budget France v2.0</h1>
        <p className="subtitle">
          Vue intégrée État + Sécurité Sociale (APU totales) • Réponse comportementale ETI • Inertie dette
        </p>
      </header>

      {/* TAB NAVIGATION */}
      <nav className="tab-bar">
        <button
          className={`tab ${activeTab === 'simulator' ? 'active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          Simulateur
        </button>
        <button
          className={`tab ${activeTab === 'baseline' ? 'active' : ''}`}
          onClick={() => setActiveTab('baseline')}
        >
          Baseline
        </button>
        <button
          className={`tab ${activeTab === 'assumptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('assumptions')}
        >
          Hypothèses
        </button>
      </nav>

      {/* SIMULATOR TAB */}
      {activeTab === 'simulator' && (
      <main className="main-content">

        {/* DEBT PROJECTION CHART - TOP OF PAGE */}
        {projections.chartData && projections.chartData.length > 0 && (
          <section className="results-section primary-chart-section">
            <h2>Trajectoire dette publique sur {projectionYears} ans</h2>
            <div className="chart-container primary-chart">
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    label={{ value: 'Dette/PIB (%)', angle: -90, position: 'insideLeft' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={60} stroke="#558b2f" strokeDasharray="3 3" label="Maastricht (60%)" />
                  <ReferenceLine y={100} stroke="#e65100" strokeDasharray="3 3" label="Seuil alerte (100%)" />
                  <Line
                    type="monotone"
                    dataKey="baselineDebtRatio"
                    stroke="#94a3b8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Baseline (PLF 2025)"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="debtRatio"
                    stroke="#2563eb"
                    strokeWidth={3}
                    name="Scénario"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 3 SMALL CHARTS — DEFICIT, GROWTH, UNEMPLOYMENT */}
        {projections.chartData && projections.chartData.length > 0 && (
          <section className="results-section">
            <h2>Trajectoires associées</h2>
            <div className="small-charts-row">

              {/* Déficit / PIB */}
              <div className="small-chart-container">
                <h3 className="small-chart-title">Déficit / PIB (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={projections.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <ReferenceLine y={3} stroke="#e65100" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="baselineDeficitRatio"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Baseline"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="deficitRatio"
                      stroke="#dc2626"
                      strokeWidth={2}
                      name="Scénario"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Croissance nominale */}
              <div className="small-chart-container">
                <h3 className="small-chart-title">Croissance nominale (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={projections.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line
                      type="monotone"
                      dataKey="baselineNominalGrowthRate"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Baseline"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="nominalGrowthRate"
                      stroke="#16a34a"
                      strokeWidth={2}
                      name="Scénario"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chômage */}
              <div className="small-chart-container">
                <h3 className="small-chart-title">Chômage (%)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={projections.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line
                      type="monotone"
                      dataKey="baselineUnemploymentRate"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Baseline"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="unemploymentRate"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      name="Scénario"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

            </div>
          </section>
        )}

        {/* KEY METRICS — YEAR 1 */}
        {projections.fullScenario && projections.fullScenario.length > 0 && (
          <section className="results-section">
            <h2>Indicateurs clés (Année 1)</h2>
            <div className="metrics-grid">
              <MetricCard
                label="Déficit année 1"
                value={projections.fullScenario[0].deficit}
                unit="Md€"
                baseline={BASELINE.integrated.deficit}
                format="billions"
              />
              <MetricCard
                label="Dette/PIB"
                value={projections.fullScenario[0].debtRatio}
                unit="%"
                baseline={projections.baseline[0].debtRatio}
                format="percent"
              />
              <MetricCard
                label="Taux d'intérêt effectif"
                value={projections.fullScenario[0].effectiveInterestRate}
                unit="%"
                baseline={projections.baseline[0].effectiveInterestRate}
                format="percent"
                decimals={2}
              />
              <MetricCard
                label="Charge d'intérêts"
                value={projections.fullScenario[0].interest}
                unit="Md€"
                baseline={projections.baseline[0].interest}
                format="billions"
              />
            </div>
          </section>
        )}

        {/* SNAPSHOT METRICS — YEAR 5 & YEAR 10 */}
        {projections.fullScenario && projections.fullScenario.length >= 10 && (
          <section className="results-section">
            <h2>Instantanés à 5 ans et 10 ans</h2>
            <div className="snapshot-row">
              <div className="snapshot-group">
                <h3 className="snapshot-label">Année 5 ({MACRO_BASELINE.year + 5})</h3>
                <div className="metrics-grid metrics-grid-3">
                  <MetricCard
                    label="Dette"
                    value={projections.fullScenario[5].debt}
                    unit="Md€"
                    baseline={projections.baseline[5].debt}
                    format="billions"
                    decimals={0}
                  />
                  <MetricCard
                    label="Déficit"
                    value={projections.fullScenario[5].deficit}
                    unit="Md€"
                    baseline={projections.baseline[5].deficit}
                    format="billions"
                    decimals={0}
                  />
                  <MetricCard
                    label="Intérêts"
                    value={projections.fullScenario[5].interest}
                    unit="Md€"
                    baseline={projections.baseline[5].interest}
                    format="billions"
                    decimals={0}
                  />
                </div>
              </div>
              <div className="snapshot-group">
                <h3 className="snapshot-label">Année 10 ({MACRO_BASELINE.year + 10})</h3>
                <div className="metrics-grid metrics-grid-3">
                  <MetricCard
                    label="Dette"
                    value={projections.fullScenario[10].debt}
                    unit="Md€"
                    baseline={projections.baseline[10].debt}
                    format="billions"
                    decimals={0}
                  />
                  <MetricCard
                    label="Déficit"
                    value={projections.fullScenario[10].deficit}
                    unit="Md€"
                    baseline={projections.baseline[10].deficit}
                    format="billions"
                    decimals={0}
                  />
                  <MetricCard
                    label="Intérêts"
                    value={projections.fullScenario[10].interest}
                    unit="Md€"
                    baseline={projections.baseline[10].interest}
                    format="billions"
                    decimals={0}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PRESET BUTTONS */}
        <section className="controls-section preset-section">
          <h2>Scénarios politiques</h2>
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
            Les boutons ci-dessus configurent tous les leviers automatiquement
          </div>
        </section>

        {/* TAX LEVERS */}
        <section className="controls-section">
          <h2>Leviers fiscaux (État)</h2>
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
          <h2>Dépenses publiques (État)</h2>
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
          <h2>Leviers Sécurité Sociale (PLFSS 2026)</h2>
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
            <h4>Contexte PLFSS 2026 :</h4>
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
          <h2>Réformes structurelles</h2>
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

          {selectedReforms.length > 0 && combinedReformEffect && (
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
          <h2>Paramètres avancés</h2>
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
            ADDITIONAL RESULTS
        =================================================================== */}

        {/* Budget Breakdown */}
        {projections.fullScenario && projections.fullScenario.length > 0 && (
          <section className="results-section">
            <h2>Décomposition du déficit (Année 1)</h2>
            <div className="budget-breakdown">
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
        )}

        {/* POLICY IMPACT CHART */}
        {(policyImpact.revenueChange !== 0 || policyImpact.spendingChange !== 0) && (
          <section className="results-section">
            <h2>Impact des leviers budgétaires</h2>
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

            {selectedReforms.length > 0 && combinedReformEffect && (
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
        {doomLoopAssessment.doomLoopActive && (
          <section className="results-section warning-section">
            <h2>Alerte : Risque de "Doom Loop"</h2>
            <div className="doom-loop-warning">
              <p><strong>Sévérité : {doomLoopAssessment.severity === 'high' ? 'Élevée' : doomLoopAssessment.severity === 'medium' ? 'Moyenne' : 'Faible'}</strong></p>
              <ul>
                <li>Variation ratio dette/PIB : +{doomLoopAssessment.debtRatioChange} pp</li>
                <li>Variation ratio intérêts/PIB : +{doomLoopAssessment.interestRatioChange} pp</li>
                <li>Augmentation prime de risque : +{doomLoopAssessment.premiumIncreaseBps} bps</li>
              </ul>
              <p className="doom-loop-explanation">
                Un "doom loop" se produit quand la dette élevée augmente les taux d'intérêt,
                ce qui augmente la dette, créant un cercle vicieux.
              </p>
            </div>
          </section>
        )}

        {/* VALIDATION WARNINGS */}
        {projections.fullScenario && !validation.valid && (
          <section className="results-section validation-section">
            <h2>Avertissements de validation</h2>
            <ul className="validation-warnings">
              {validation.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </section>
        )}
      </main>
      )}

      {/* BASELINE TAB */}
      {activeTab === 'baseline' && (
        <main className="main-content page-baseline">
          <section className="baseline-section">
            <h2>Budget de référence : PLF 2025 + PLFSS 2026</h2>
            <p className="section-subtitle">Projet de loi de finances initial (Michel Barnier)</p>

            <div className="baseline-grid">
              {/* ÉTAT */}
              <div className="baseline-column">
                <h3>État (PLF 2025)</h3>

                <table className="baseline-table">
                  <thead>
                    <tr>
                      <th>Recettes</th>
                      <th className="amount">Md€</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Impôt sur le revenu</td><td className="amount">{BASELINE.etat.incomeTax}</td></tr>
                    <tr><td>TVA</td><td className="amount">{BASELINE.etat.vat}</td></tr>
                    <tr><td>Impôt sur les sociétés</td><td className="amount">{BASELINE.etat.corporateTax}</td></tr>
                    <tr><td>Autres recettes fiscales</td><td className="amount">{BASELINE.etat.otherTax}</td></tr>
                    <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.etat.revenuTotal}</td></tr>
                  </tbody>
                </table>

                <table className="baseline-table">
                  <thead>
                    <tr>
                      <th>Dépenses</th>
                      <th className="amount">Md€</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Éducation nationale</td><td className="amount">{BASELINE.etat.education}</td></tr>
                    <tr><td>Défense</td><td className="amount">{BASELINE.etat.defense}</td></tr>
                    <tr><td>Solidarité & insertion</td><td className="amount">{BASELINE.etat.solidarity}</td></tr>
                    <tr><td>Transition écologique</td><td className="amount">{BASELINE.etat.ecological}</td></tr>
                    <tr><td>Autres missions</td><td className="amount">{BASELINE.etat.otherSpending}</td></tr>
                    <tr className="total-row"><td>Total dépenses</td><td className="amount">{BASELINE.etat.spendingTotal}</td></tr>
                  </tbody>
                </table>

                <div className="deficit-box etat">
                  <span>Déficit État</span>
                  <span className="deficit-value">{BASELINE.etat.deficit} Md€</span>
                </div>
              </div>

              {/* SÉCURITÉ SOCIALE */}
              <div className="baseline-column">
                <h3>Sécurité Sociale (PLFSS 2026)</h3>

                <table className="baseline-table">
                  <thead>
                    <tr>
                      <th>Recettes</th>
                      <th className="amount">Md€</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Cotisations sociales</td><td className="amount">{BASELINE.securiteSociale.cotisations}</td></tr>
                    <tr><td>CSG (toutes sources)</td><td className="amount">{BASELINE.securiteSociale.csg}</td></tr>
                    <tr><td>Impôts et taxes affectés</td><td className="amount">{BASELINE.securiteSociale.impotsTaxes}</td></tr>
                    <tr><td>Compensations État</td><td className="amount">{BASELINE.securiteSociale.cotisationsEtat}</td></tr>
                    <tr><td>Transferts inter-régimes</td><td className="amount">{BASELINE.securiteSociale.transferts}</td></tr>
                    <tr><td>Autres produits</td><td className="amount">{BASELINE.securiteSociale.autresProduits}</td></tr>
                    <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.securiteSociale.revenuTotal}</td></tr>
                  </tbody>
                </table>

                <table className="baseline-table">
                  <thead>
                    <tr>
                      <th>Dépenses</th>
                      <th className="amount">Md€</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>Vieillesse (retraites)</td><td className="amount">{BASELINE.securiteSociale.vieillesse}</td></tr>
                    <tr><td>Maladie</td><td className="amount">{BASELINE.securiteSociale.maladie}</td></tr>
                    <tr><td>Famille</td><td className="amount">{BASELINE.securiteSociale.famille}</td></tr>
                    <tr><td>Accidents du travail (AT-MP)</td><td className="amount">{BASELINE.securiteSociale.atmp}</td></tr>
                    <tr><td>Autonomie</td><td className="amount">{BASELINE.securiteSociale.autonomie}</td></tr>
                    <tr className="total-row"><td>Total dépenses</td><td className="amount">{BASELINE.securiteSociale.spendingTotal}</td></tr>
                  </tbody>
                </table>

                <div className="deficit-box ss">
                  <span>Déficit Sécurité Sociale</span>
                  <span className="deficit-value">{BASELINE.securiteSociale.deficit} Md€</span>
                </div>
              </div>
            </div>

            {/* CONSOLIDATED */}
            <div className="consolidated-box">
              <h3>APU Consolidées (État + Sécurité Sociale)</h3>
              <div className="consolidated-row">
                <span>Total recettes</span>
                <span className="amount">{BASELINE.integrated.revenuTotal} Md€</span>
              </div>
              <div className="consolidated-row">
                <span>Total dépenses</span>
                <span className="amount">{BASELINE.integrated.spendingTotal} Md€</span>
              </div>
              <div className="consolidated-row deficit">
                <span>Déficit total</span>
                <span className="amount">{BASELINE.integrated.deficit} Md€</span>
              </div>
              <p className="consolidated-note">
                Soit environ {Math.abs(BASELINE.integrated.deficit / MACRO_BASELINE.gdp * 100).toFixed(1)}% du PIB
              </p>
            </div>

            <p className="source-note">
              Sources : PLF 2025 (Barnier), PLFSS 2026 Annexe 3, CCSS 2024 (structure des recettes SS)
            </p>
          </section>
        </main>
      )}

      {/* ASSUMPTIONS TAB */}
      {activeTab === 'assumptions' && (
        <main className="main-content page-assumptions">
          <section className="assumptions-section">
            <h2>Hypothèses du modèle</h2>
            <p className="section-subtitle">Paramètres économiques et sources académiques</p>

            {/* MACRO */}
            <div className="assumptions-category">
              <h3>Paramètres macroéconomiques</h3>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.macro.map((item, i) => (
                    <tr key={i}>
                      <td>{item.parameter}</td>
                      <td className="value">{item.value}</td>
                      <td>{item.impact}</td>
                      <td>{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FISCAL */}
            <div className="assumptions-category">
              <h3>Élasticités fiscales</h3>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.fiscal.map((item, i) => (
                    <tr key={i}>
                      <td>{item.parameter}</td>
                      <td className="value">{item.value}</td>
                      <td>{item.impact}</td>
                      <td>{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* BEHAVIORAL RESPONSE */}
            <div className="assumptions-category">
              <h3>Réponse comportementale aux taxes (ETI)</h3>
              <p className="assumptions-note">
                Module 2 (ETI) + Module 3 (émigration fiscale).
                increaseEfficiency = fraction du rendement statique réalisée pour une hausse.
                decreaseEfficiency = multiplicateur pour une baisse (effet offre modéré).
                growthDragPerPp = frein croissance par pp de hausse (traîne nulle pour les baisses).
              </p>
              <table className="assumptions-table">
                <thead>
                  <tr>
                    <th>Taxe</th>
                    <th>Efficacité hausse</th>
                    <th>Efficacité baisse</th>
                    <th>Frein croissance/pp</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(BEHAVIORAL_RESPONSE).map(([key, val]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="value">{(val.increaseEfficiency * 100).toFixed(0)}%</td>
                      <td className="value">{(val.decreaseEfficiency * 100).toFixed(0)}%</td>
                      <td className="value">{(val.growthDragPerPp * 100).toFixed(2)} pp</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* FISCAL MULTIPLIERS */}
            <div className="assumptions-category">
              <h3>Multiplicateurs fiscaux des dépenses (Module 4)</h3>
              <p className="assumptions-note">
                Multiplicateurs en expansion (gap de production ≈ 0, France 2025).
                Offset monétaire = 0 (BCE supranationale, pas de crowding-out national).
              </p>
              <table className="assumptions-table">
                <thead>
                  <tr>
                    <th>Catégorie</th>
                    <th>Expansion (gap ≈ 0)</th>
                    <th>Récession (gap &lt; 0)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(FISCAL_MULTIPLIERS).map(([key, val]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td className="value">{val.expansion.toFixed(2)}</td>
                      <td className="value">{val.recession.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RISK PREMIUM */}
            <div className="assumptions-category">
              <h3>Prime de risque souverain + inertie dette</h3>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.riskPremium.map((item, i) => (
                    <tr key={i}>
                      <td>{item.parameter}</td>
                      <td className="value">{item.value}</td>
                      <td>{item.impact}</td>
                      <td>{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* REFORMS */}
            <div className="assumptions-category">
              <h3>Réformes structurelles</h3>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.reforms.map((item, i) => (
                    <tr key={i}>
                      <td>{item.parameter}</td>
                      <td className="value">{item.value}</td>
                      <td>{item.impact}</td>
                      <td>{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="methodology-note">
              Les paramètres sont calibrés sur la littérature académique et les publications institutionnelles.
              L'incertitude sur ces valeurs est significative ; le modèle est à visée pédagogique.
            </p>
          </section>
        </main>
      )}

      <footer className="footer">
        <p>Simulateur Budget France v2.0 • Sources : PLF 2025, PLFSS 2026, IMF, OECD, ECB, AFT</p>
        <p className="footer-note">
          Vue consolidée État + Sécurité Sociale. Réponse comportementale ETI. Inertie taux OAT.
        </p>
      </footer>
    </div>
  )
}

// =============================================================================
// UI COMPONENTS
// =============================================================================

function SliderControl({ label, value, onChange, min, max, step, unit, help, decimals = 0 }) {
  // Safety check for undefined value
  const safeValue = value ?? 0

  return (
    <div className="control">
      <div className="control-header">
        <label>{label}</label>
        <span className="control-value">
          {safeValue.toFixed(decimals)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
      />
      {help && <p className="control-help">{help}</p>}
    </div>
  )
}

function MetricCard({ label, value, unit, baseline, format, decimals = 1 }) {
  // Safety checks
  const safeValue = value ?? 0
  const safeBaseline = baseline ?? 0
  const delta = safeValue - safeBaseline
  const deltaPercent = safeBaseline !== 0 ? (delta / Math.abs(safeBaseline)) * 100 : 0

  // Determine if this is a "worse" or "better" change
  let deltaClass = ''
  if (format === 'billions') {
    // For deficit: negative is good (less deficit)
    deltaClass = delta < 0 ? 'metric-better' : (delta > 0 ? 'metric-worse' : '')
  } else if (format === 'percent') {
    // For debt/GDP: lower is better
    deltaClass = delta < 0 ? 'metric-better' : (delta > 0 ? 'metric-worse' : '')
  }

  // Show negative values (deficits) in red
  const isNegativeValue = safeValue < 0

  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${isNegativeValue ? 'negative' : ''}`}>
        {safeValue.toFixed(decimals)} {unit}
      </div>
      <div className={`metric-diff ${deltaClass}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(decimals)} {unit}
        {' '}({delta > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
      </div>
    </div>
  )
}

export default App
