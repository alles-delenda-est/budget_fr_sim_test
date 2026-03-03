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
  SOCIAL_HOUSING_LIQUIDATION,
  ROLLOVER_RATE,
  DEFICIT_STRESS_THRESHOLD,
  DEFICIT_STRESS_SENSITIVITY,
  DEMOGRAPHIC_PARAMS,
  DEMOGRAPHIC_PRESSURE_PER_YEAR,
  SENIOR_EMPLOYMENT,
  PENSION_REFORM,
  MIGRATION_PARAMS,
  MIGRATION_NET_WORKERS_PER_YEAR,
  DEPENDANCE_PARAMS,
  projectFiscalPath,
  getBaselineProjection,
  compareProjections,
  assessDoomLoop,
  validateProjection,
} from './projection-engine-v1.8'

// Import policy impact calculation and data
import { BASELINE, PRESETS, PENSION_REFORM_PRESETS, calculatePolicyImpact, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from './policy-impact'

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
  demographic: [
    {
      parameter: "Dérive ratio dépendance",
      value: "+0,48 pp/an",
      impact: `+${DEMOGRAPHIC_PRESSURE_PER_YEAR.toFixed(1)} Md€/an pression sur dépenses pension+santé`,
      source: "INSEE 2024 Projections de population",
      link: "https://www.insee.fr/fr/statistiques"
    },
    {
      parameter: "Élasticité pension/dépendance",
      value: "0,80",
      impact: "Retraites (303,4 Md€) croissent avec le vieillissement",
      source: "COR 2024 rapport annuel",
      link: null
    },
    {
      parameter: "Élasticité santé/dépendance",
      value: "0,50",
      impact: "Maladie (262,3 Md€) croît avec le vieillissement",
      source: "DREES 2024",
      link: null
    },
    {
      parameter: "Prime politique (OAT spread)",
      value: "+21 bps",
      impact: "Composante politique du taux d'intérêt (déjà intégrée)",
      source: "Bloomberg OAT-Bund 10Y Q4 2024, ECB FSR Nov 2024",
      link: null
    },
    {
      parameter: "Plancher ONDAM",
      value: "-3% seuil, -7% plancher",
      impact: "Rendements décroissants des coupes santé (déserts médicaux)",
      source: "DREES 2024, FNAIM",
      link: null
    },
    {
      parameter: "Taux emploi seniors",
      value: "58% → 65% (benchmark UE)",
      impact: "+4,9 Md€ cotisations à 10 ans (si réforme marché travail)",
      source: "DARES 2024, Eurostat",
      link: null
    },
  ],
  reforms: [
    {
      parameter: "Hartz-IV (fusion RSA/ASS)",
      value: "+0,35 pp/an",
      impact: "Croissance potentielle, délai 2 ans, emploi seniors +4pp",
      source: "Krebs & Scheffel (2013), Dustmann et al. (2014)",
      link: null
    },
    {
      parameter: "Contrat unique + droit de licencier",
      value: "+0,45 pp/an",
      impact: "Flexibilisation radicale, délai 3 ans, emploi seniors +6pp",
      source: "Blanchard & Tirole (2003), Bassanini & Duval (2006)",
      link: null
    },
    {
      parameter: "Déréglementation marchés (PMR)",
      value: "+0,10 pp/an",
      impact: "Productivité via concurrence, délai 2 ans",
      source: "OCDE PMR indicators",
      link: "https://www.oecd.org/economy/reform/indicators-of-product-market-regulation/"
    },
    {
      parameter: "Dérégulation logement modérée",
      value: "+0,05 pp/an",
      impact: "Retour à 2010, abolition encadrement loyers + DPE",
      source: "Diamond et al. (2019), Sims (2007)",
      link: null
    },
    {
      parameter: "Abolition encadrement des loyers",
      value: "+0,03 pp/an",
      impact: "Suppression contrôle loyers, PLU/DPE inchangés",
      source: "Diamond et al. (2019), Autor et al. (2014)",
      link: null
    },
    {
      parameter: "PLU national R+8 gares + abolition encadrement",
      value: "+0,25 pp/an",
      impact: "Construction R+8 à 1km gares, délai 4 ans, durée 20 ans",
      source: "Hsieh & Moretti (2019), Hilber & Vermeulen (2016)",
      link: "https://doi.org/10.1016/j.jue.2015.11.003"
    },
    {
      parameter: "Liquidation parc HLM",
      value: "750 Md€ sur 10 ans",
      impact: "75 Md€/an réduction dette, effet croissance +0,02pp/an",
      source: "ANCOLS 2025, MeilleursAgents, USH, UK Right to Buy",
      link: null
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
      value: "+0,07 pp/an",
      impact: "Compétitivité industrielle, délai 2 ans (réduit: France déjà compétitive)",
      source: "CRE 2024, Eurostat energy prices",
      link: "https://www.cre.fr/"
    },
  ],
  taxCutBoosts: [
    {
      parameter: "IR: boost croissance par pp de baisse",
      value: "+0,08 pp",
      impact: "67% du drag; asymétrique (émigration irréversible)",
      source: "Romer & Romer (2010), Kleven et al. (2014)",
      link: null
    },
    {
      parameter: "IS: boost croissance par pp de baisse",
      value: "+0,12 pp",
      impact: "48% du drag; investissement, profit-shifting retour",
      source: "Gechert & Heimberger (2022), Mertens & Ravn (2013)",
      link: null
    },
    {
      parameter: "TVA: boost croissance par pp de baisse",
      value: "+0,03 pp",
      impact: "75% du drag; taxe conso, peu d'effet offre",
      source: "Mirrlees Review (2011)",
      link: null
    },
    {
      parameter: "CSG: boost croissance par pp de baisse",
      value: "+0,06 pp",
      impact: "75% du drag; base large, faible distorsion",
      source: "Mirrlees Review (2011), Saez et al. (2012)",
      link: null
    },
    {
      parameter: "Cotisations: boost croissance par pp de baisse",
      value: "+0,20 pp",
      impact: "111% du drag; coin fiscal France 47%, effet emploi SMIC",
      source: "Crépon & Desplatz (2001), France Stratégie CICE (2020)",
      link: null
    },
  ],
  pensionReform: [
    {
      parameter: "Masse pension Sécu (vieillesse)",
      value: "303,4 Md€",
      impact: "Base pour calcul des réformes retraites",
      source: "PLFSS 2025, francetdb.com",
      link: null
    },
    {
      parameter: "Ratio cotisants/retraité",
      value: "1,70",
      impact: "Déclin -0,012/an → pression sur financement",
      source: "COR 2024 rapport annuel",
      link: null
    },
    {
      parameter: "Effet âge retraite",
      value: "-2,5%/an au-delà de 64",
      impact: "Chaque année supplémentaire réduit la masse pension",
      source: "francetdb.com rtRunModel()",
      link: null
    },
    {
      parameter: "Comptes notionnels (suédois)",
      value: "-6% masse pension",
      impact: "Mise en place sur 15 ans à partir de 2027",
      source: "francetdb.com, modèle NDC",
      link: null
    },
    {
      parameter: "Plancher pension",
      value: "65% du niveau initial",
      impact: "Les réformes ne peuvent réduire les pensions au-delà",
      source: "Contrainte politique modélisée",
      link: null
    },
    {
      parameter: "Immigration nette",
      value: "270k entrants, 200k sortants/an",
      impact: "-1,1 Md€/an impact fiscal (brain drain)",
      source: "INSEE 2023, francetdb.com",
      link: null
    },
    {
      parameter: "Dépendance/autonomie",
      value: "43,5 Md€, +5,5%/an",
      impact: "Croissance excédentaire vs PIB (+16 Md€ à 10 ans)",
      source: "PLFSS 2025, DREES",
      link: null
    },
  ],
}

// =============================================================================
// REFORM GROUPING
// =============================================================================

const HOUSING_REFORM_KEYS = ['housingModerate', 'housingRentControl', 'housingAmbitious']
const CHECKBOX_REFORM_KEYS = Object.keys(STRUCTURAL_REFORMS).filter(
  k => !HOUSING_REFORM_KEYS.includes(k)
)

const REFORM_GROUPS = [
  { label: "Marché du travail", keys: ['hartzIV', 'radicalFlex'] },
  { label: "Autre", keys: ['productMarketRegulation', 'education', 'energy'] },
  { label: "Paquets composites", keys: ['ambitious', 'modest'] },
]

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

  // Pension reform levers
  const [retirementAge, setRetirementAge] = useState(64)
  const [desindexation, setDesindexation] = useState(0)
  const [pensionCap, setPensionCap] = useState(0)
  const [notionnel, setNotionnel] = useState(false)

  // Tab navigation
  const [activeTab, setActiveTab] = useState('simulator')

  // Structural reform selector - SUPPORTS MULTIPLE (checkbox reforms)
  const [selectedReforms, setSelectedReforms] = useState([])  // Array of reform keys
  // Housing reform selector - mutually exclusive (radio buttons)
  const [selectedHousingReform, setSelectedHousingReform] = useState(null)  // string | null
  // Social housing liquidation toggle
  const [enableSocialHousingLiquidation, setEnableSocialHousingLiquidation] = useState(false)

  // Calculate combined reform effect (checkbox reforms + housing radio)
  const combinedReformEffect = useMemo(() => {
    const allKeys = [...selectedReforms]
    if (selectedHousingReform) allKeys.push(selectedHousingReform)

    if (allKeys.length === 0) return null

    // Sum growth effects (with diminishing returns for overlap)
    const totalGrowthEffect = allKeys.reduce((sum, key) => {
      return sum + STRUCTURAL_REFORMS[key].growthEffect
    }, 0) * 0.85  // 15% overlap penalty when combining

    // Use seniorEmploymentGain from the first reform that has one
    const seniorReform = allKeys.find(k => STRUCTURAL_REFORMS[k].seniorEmploymentGain != null)
    const seniorEmploymentGain = seniorReform ? STRUCTURAL_REFORMS[seniorReform].seniorEmploymentGain : undefined

    return {
      label: `${allKeys.length} réformes combinées`,
      growthEffect: totalGrowthEffect,
      lag: Math.min(...allKeys.map(k => STRUCTURAL_REFORMS[k].lag)),
      duration: Math.max(...allKeys.map(k => STRUCTURAL_REFORMS[k].duration)),
      source: "Combinaison personnalisée",
      confidence: "variable",
      reforms: allKeys.map(k => STRUCTURAL_REFORMS[k].label),
      ...(seniorEmploymentGain != null ? { seniorEmploymentGain } : {}),
    }
  }, [selectedReforms, selectedHousingReform])

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

    // Apply reforms — separate housing reforms (radio) from checkbox reforms
    const housingKeys = ['housingModerate', 'housingRentControl', 'housingAmbitious']
    const housingReform = reforms.find(k => housingKeys.includes(k)) || null
    const checkboxReforms = reforms.filter(k => !housingKeys.includes(k))
    setSelectedReforms(checkboxReforms)
    setSelectedHousingReform(housingReform)
  }

  // Apply COR / pension reform preset
  const applyCORPreset = (presetKey) => {
    const preset = PENSION_REFORM_PRESETS[presetKey]
    if (!preset) return

    const { pensionReform: pr } = preset
    setRetirementAge(pr.retirementAge)
    setDesindexation(pr.desindexation)
    setPensionCap(pr.pensionCap)
    setNotionnel(pr.notionnel)
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

  // Build pension reform option (null if all defaults)
  const pensionReformOption = useMemo(() => {
    const isDefault = retirementAge === 64 && desindexation === 0 && pensionCap === 0 && !notionnel
    if (isDefault) return null
    return { retirementAge, desindexation, pensionCap, notionnel, capitalisation: 0 }
  }, [retirementAge, desindexation, pensionCap, notionnel])

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
      pensionReform: pensionReformOption,
    })

    // Policy + Reform scenario
    const reform = combinedReformEffect
    const allReformKeys = [...selectedReforms]
    if (selectedHousingReform) allReformKeys.push(selectedHousingReform)
    const fullScenario = projectFiscalPath(policyImpact, {
      years: projectionYears,
      enableRiskPremium: true,
      politicalRiskPremium: politicalRisk / 10000,
      structuralReform: reform,
      structuralReformKeys: allReformKeys.length > 0 ? allReformKeys : null,
      pensionReform: pensionReformOption,
      enableSocialHousingLiquidation,
    })

    // Merge baseline fields into fullScenario for chart comparison
    const chartData = fullScenario.map((item, i) => ({
      ...item,
      baselineDebtRatio: baseline[i]?.debtRatio,
      baselineDeficitRatio: baseline[i]?.deficitRatio,
      baselineNominalGrowthRate: baseline[i]?.nominalGrowthRate,
      baselineUnemploymentRate: baseline[i]?.unemploymentRate,
      // Ratio cotisants/retraité projection
      cotisantsPerRetraite: PENSION_REFORM.cotisantsPerRetraite - (i * PENSION_REFORM.ratioDeclinePerYear)
        + ((pensionReformOption?.retirementAge ?? 64) - 64) * PENSION_REFORM.retirementAge.ratioImprovementPerYear
          * Math.min(i / PENSION_REFORM.retirementAge.rampUpYears, 1),
    }))

    return { baseline, policyScenario, fullScenario, chartData }
  }, [policyImpact, projectionYears, selectedReforms, selectedHousingReform, politicalRisk, combinedReformEffect, pensionReformOption, enableSocialHousingLiquidation])

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
        <h1>Simulateur Budget France <span className="version-badge">v2.0</span></h1>
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

              {/* Ratio cotisants/retraité */}
              <div className="small-chart-container">
                <h3 className="small-chart-title">Cotisants/retraité</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={projections.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => v.toFixed(2)} />
                    <ReferenceLine y={1.5} stroke="#e65100" strokeDasharray="3 3" />
                    <Line
                      type="monotone"
                      dataKey="cotisantsPerRetraite"
                      stroke="#0891b2"
                      strokeWidth={2}
                      name="Ratio"
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

                {/* Sustainability metrics */}
                <div className="sustainability-metrics">
                  <h4>Soutenabilité retraites (An 10)</h4>
                  <div className="sustainability-row">
                    <span>Cotisants/retraité :</span>
                    <span className="sustainability-value">
                      {(PENSION_REFORM.cotisantsPerRetraite - 10 * PENSION_REFORM.ratioDeclinePerYear
                        + ((pensionReformOption?.retirementAge ?? 64) - 64) * PENSION_REFORM.retirementAge.ratioImprovementPerYear
                          * Math.min(10 / PENSION_REFORM.retirementAge.rampUpYears, 1)).toFixed(2)}
                    </span>
                  </div>
                  <div className="sustainability-row">
                    <span>Economies retraites :</span>
                    <span className="sustainability-value">{projections.fullScenario[10].pensionReformSaving} Md€</span>
                  </div>
                  <div className="sustainability-row">
                    <span>Impact migration :</span>
                    <span className="sustainability-value">{projections.fullScenario[10].migrationImpact} Md€</span>
                  </div>
                  <div className="sustainability-row">
                    <span>Pression dépendance :</span>
                    <span className="sustainability-value">+{projections.fullScenario[10].dependancePressure} Md€</span>
                  </div>
                  {enableSocialHousingLiquidation && (
                    <div className="sustainability-row">
                      <span>Cession HLM (an 10) :</span>
                      <span className="sustainability-value">{projections.fullScenario[10].socialHousingWindfall} Md€</span>
                    </div>
                  )}
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
            <div className="control-with-refs">
              <SliderControl
                label="Dépenses santé (ONDAM)"
                value={healthSpending}
                onChange={setHealthSpending}
                min={-10}
                max={10}
                step={1}
                unit="%"
              />
              {policyImpact.ondamWarning && (
                <div className={`ondam-warning ondam-${policyImpact.ondamWarningLevel}`}>
                  <strong>Contrainte ONDAM :</strong> Coupe demandée {healthSpending}% → effective {policyImpact.ondamEffectiveCut.toFixed(1)}%
                  <br />
                  <small>Déserts médicaux, urgences saturées — rendements décroissants au-delà de -3%</small>
                </div>
              )}
            </div>

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

        {/* PENSION REFORM */}
        <section className="controls-section ss-section">
          <h2>Réforme des retraites (francetdb.com)</h2>
          <p className="section-help">
            Réformes structurelles du système de retraites — effets dynamiques sur {projectionYears} ans
          </p>

          {/* COR Preset Buttons */}
          <div className="preset-grid">
            {Object.entries(PENSION_REFORM_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                className="preset-btn preset-btn-sm"
                onClick={() => applyCORPreset(key)}
              >
                <strong>{preset.label}</strong>
                <span className="preset-desc">{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="controls-grid">
            <SliderControl
              label="Âge de départ en retraite"
              value={retirementAge}
              onChange={setRetirementAge}
              min={60}
              max={72}
              step={0.5}
              unit="ans"
              decimals={1}
              help="Âge légal actuel: 64 ans. Chaque année au-delà réduit la masse pension de 2,5%"
            />
            <SliderControl
              label="Désindexation"
              value={desindexation}
              onChange={setDesindexation}
              min={-1}
              max={2}
              step={0.1}
              unit="pt"
              decimals={1}
              help="Points de réduction de la revalorisation annuelle des pensions"
            />
            <SliderControl
              label="Plafonnement hautes pensions"
              value={pensionCap}
              onChange={setPensionCap}
              min={0}
              max={20}
              step={0.5}
              unit="%"
              decimals={1}
              help="Pourcentage de la masse pension plafonnée"
            />
            <div className="control">
              <div className="control-header">
                <label>Comptes notionnels (suédois)</label>
              </div>
              <label className="reform-checkbox-label" style={{ marginTop: '8px' }}>
                <input
                  type="checkbox"
                  checked={notionnel}
                  onChange={(e) => setNotionnel(e.target.checked)}
                />
                <span>Activer le système de comptes notionnels (-6% masse pension sur 15 ans)</span>
              </label>
            </div>
          </div>

          {/* Pension reform savings display */}
          {pensionReformOption && projections.fullScenario && projections.fullScenario.length > 10 && (
            <div className="combined-reforms-summary">
              <h4>Impact réforme retraites :</h4>
              <div className="combined-effect">
                <strong>Economie pension (Année 10) :</strong> {projections.fullScenario[10].pensionReformSaving} Md€
              </div>
            </div>
          )}
        </section>

        {/* STRUCTURAL REFORMS */}
        <section className="controls-section">
          <h2>Réformes structurelles</h2>
          <p className="section-help">
            Sélectionner plusieurs réformes (effet cumulatif avec pénalité de 15% pour chevauchements).
            Les réformes logement sont mutuellement exclusives (radio).
          </p>

          {/* Checkbox reforms grouped by category */}
          {REFORM_GROUPS.map(group => (
            <div key={group.label} className="reform-group">
              <h4 className="reform-group-title">{group.label}</h4>
              <div className="reform-checkboxes">
                {group.keys.filter(k => STRUCTURAL_REFORMS[k]).map(key => {
                  const reform = STRUCTURAL_REFORMS[key]
                  return (
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
                          {reform.seniorEmploymentGain != null && ` • Emploi seniors: +${(reform.seniorEmploymentGain * 100).toFixed(0)}pp`}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Housing reforms - radio buttons (mutually exclusive) */}
          <div className="reform-group">
            <h4 className="reform-group-title">Logement / Urbanisme</h4>
            <div className="reform-checkboxes">
              {HOUSING_REFORM_KEYS.map(key => {
                const reform = STRUCTURAL_REFORMS[key]
                return (
                  <label key={key} className="reform-checkbox-label">
                    <input
                      type="radio"
                      name="housingReform"
                      checked={selectedHousingReform === key}
                      onChange={() => setSelectedHousingReform(
                        selectedHousingReform === key ? null : key
                      )}
                    />
                    <div className="reform-checkbox-content">
                      <strong>{reform.label}</strong>
                      <span className="reform-effect">+{(reform.growthEffect * 100).toFixed(2)}pp/an</span>
                      <span className="reform-details">
                        Délai: {reform.lag} ans • Durée: {reform.duration} ans
                      </span>
                    </div>
                  </label>
                )
              })}
              {selectedHousingReform && (
                <button
                  className="reform-clear-btn"
                  onClick={() => setSelectedHousingReform(null)}
                >
                  Aucune réforme logement
                </button>
              )}
            </div>

            {/* Social housing liquidation toggle */}
            <label className="reform-checkbox-label" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
              <input
                type="checkbox"
                checked={enableSocialHousingLiquidation}
                onChange={(e) => setEnableSocialHousingLiquidation(e.target.checked)}
              />
              <div className="reform-checkbox-content">
                <strong>Liquidation parc HLM</strong>
                <span className="reform-effect">{SOCIAL_HOUSING_LIQUIDATION.annualProceeds} Md€/an pendant {SOCIAL_HOUSING_LIQUIDATION.saleDurationYears} ans</span>
                <span className="reform-details">
                  Actif total: {SOCIAL_HOUSING_LIQUIDATION.totalAssetValue} Md€ • {SOCIAL_HOUSING_LIQUIDATION.source}
                </span>
              </div>
            </label>
          </div>

          {(selectedReforms.length > 0 || selectedHousingReform) && combinedReformEffect && (
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
              label="Prime de risque politique (additionnelle)"
              value={politicalRisk}
              onChange={setPoliticalRisk}
              min={0}
              max={200}
              step={10}
              unit="bps"
              help="Prime ADDITIONNELLE au-delà des 21 bps déjà intégrés (crise politique 2024)"
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

            {(selectedReforms.length > 0 || selectedHousingReform) && combinedReformEffect && (
              <div className="reform-impact-note">
                <p>
                  ✓ <strong>{combinedReformEffect.reforms.length} réforme(s) structurelle(s)</strong> activée(s)
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
                growthDragPerPp = frein croissance par pp de hausse.
                growthBoostPerPp = boost croissance par pp de baisse (asymétrique).
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

            {/* DEMOGRAPHIC & STRUCTURAL PARAMETERS */}
            <div className="assumptions-category">
              <h3>Paramètres démographiques et structurels (francetdb.com)</h3>
              <p className="assumptions-note">
                Intégrations de données réelles: dérive démographique, prime politique OAT,
                plancher ONDAM, emploi seniors. Source: INSEE, COR, DREES, DARES, Bloomberg.
              </p>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.demographic.map((item, i) => (
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

            {/* PENSION REFORM */}
            <div className="assumptions-category">
              <h3>Réforme des retraites et soutenabilité (francetdb.com/#retraites)</h3>
              <p className="assumptions-note">
                Paramètres du modèle de réforme des retraites, migration, et dépendance.
                Source: francetdb.com, COR 2024, INSEE, DREES.
              </p>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.pensionReform.map((item, i) => (
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

            {/* TAX CUT GROWTH BOOSTS */}
            <div className="assumptions-category">
              <h3>Boost croissance des baisses d'impôts</h3>
              <p className="assumptions-note">
                Effet symétrique (mais asymétrique en magnitude) des baisses d'impôts sur la croissance.
                Les hausses créent un frein (growthDragPerPp), les baisses un boost (growthBoostPerPp).
              </p>
              <table className="assumptions-table">
                <thead>
                  <tr><th>Hypothèse</th><th>Valeur</th><th>Impact</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {ASSUMPTIONS.taxCutBoosts.map((item, i) => (
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
