import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import SliderControl from '../components/SliderControl'
import MetricCard from '../components/MetricCard'
import './SimulateurRetraitesPage.css'

import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  PENSION_REFORM,
  DEMOGRAPHIC_PARAMS,
  DEMOGRAPHIC_PRESSURE_PER_YEAR,
  MIGRATION_PARAMS,
  MIGRATION_NET_WORKERS_PER_YEAR,
  DEPENDANCE_PARAMS,
  SENIOR_EMPLOYMENT,
  projectFiscalPath,
  getBaselineProjection,
} from '../projection-engine-v1.8'

import { PENSION_REFORM_PRESETS } from '../policy-impact'

export default function SimulateurRetraitesPage() {
  // Pension reform levers
  const [retirementAge, setRetirementAge] = useState(64)
  const [desindexation, setDesindexation] = useState(0)
  const [pensionCap, setPensionCap] = useState(0)
  const [notionnel, setNotionnel] = useState(false)

  // Labor reform (affects senior employment)
  const [selectedLaborReform, setSelectedLaborReform] = useState(null) // 'hartzIV' | 'radicalFlex' | null

  // Projection horizon
  const [projectionYears, setProjectionYears] = useState(20)

  // Apply COR preset
  const applyCORPreset = (presetKey) => {
    const preset = PENSION_REFORM_PRESETS[presetKey]
    if (!preset) return
    const { pensionReform: pr } = preset
    setRetirementAge(pr.retirementAge)
    setDesindexation(pr.desindexation)
    setPensionCap(pr.pensionCap)
    setNotionnel(pr.notionnel)
  }

  // Build pension reform option
  const pensionReformOption = useMemo(() => {
    const isDefault = retirementAge === 64 && desindexation === 0 && pensionCap === 0 && !notionnel
    if (isDefault) return null
    return { retirementAge, desindexation, pensionCap, notionnel, capitalisation: 0 }
  }, [retirementAge, desindexation, pensionCap, notionnel])

  // Build structural reform for senior employment
  const structuralReform = useMemo(() => {
    if (!selectedLaborReform) return null
    return STRUCTURAL_REFORMS[selectedLaborReform]
  }, [selectedLaborReform])

  // Projections: baseline vs reform scenario
  const projections = useMemo(() => {
    const baseline = getBaselineProjection(projectionYears)

    const reformScenario = projectFiscalPath(
      { revenueChange: 0, spendingChange: 0, growthEffect: 0 },
      {
        years: projectionYears,
        enableRiskPremium: true,
        pensionReform: pensionReformOption,
        structuralReform: structuralReform,
      }
    )

    // Chart data with baseline comparison + cotisants/retraite ratio
    const chartData = reformScenario.map((item, i) => {
      const baselineCotisants = PENSION_REFORM.cotisantsPerRetraite - (i * PENSION_REFORM.ratioDeclinePerYear)
      const reformCotisants = baselineCotisants
        + ((pensionReformOption?.retirementAge ?? 64) - 64) * PENSION_REFORM.retirementAge.ratioImprovementPerYear
          * Math.min(i / PENSION_REFORM.retirementAge.rampUpYears, 1)

      return {
        ...item,
        baselineDebtRatio: baseline[i]?.debtRatio,
        baselineDeficitRatio: baseline[i]?.deficitRatio,
        baselinePensionSaving: 0,
        baselineCotisantsPerRetraite: baselineCotisants,
        cotisantsPerRetraite: reformCotisants,
        cumulativeDemographicCost: (i * DEMOGRAPHIC_PRESSURE_PER_YEAR),
        cumulativeMigrationCost: Math.abs(i * MIGRATION_NET_WORKERS_PER_YEAR * MIGRATION_PARAMS.avgCotisationsPerWorker / 1e9),
        dependancePressureCalc: DEPENDANCE_PARAMS.baseline * (Math.pow(1 + DEPENDANCE_PARAMS.annualGrowthRate, i) - Math.pow(1 + DEPENDANCE_PARAMS.gdpGrowthBaseline, i)),
      }
    })

    return { baseline, reformScenario, chartData }
  }, [projectionYears, pensionReformOption, structuralReform])

  // Key year indices
  const yr5 = Math.min(5, projectionYears)
  const yr10 = Math.min(10, projectionYears)
  const yr20 = Math.min(20, projectionYears)

  return (
    <div className="retraites-page">
      <p className="page-intro">
        Simulateur dedie aux reformes du systeme de retraites. Utilise le meme moteur de projection
        que le simulateur budget, mais focalise sur les leviers pension : age de depart, desindexation,
        plafonnement, comptes notionnels, et reforme du marche du travail (emploi seniors).
      </p>

      {/* COR PRESETS */}
      <section className="controls-section">
        <h2>Scenarios COR (Conseil d'Orientation des Retraites)</h2>
        <div className="preset-grid">
          {Object.entries(PENSION_REFORM_PRESETS).map(([key, preset]) => (
            <button key={key} className="preset-btn preset-btn-sm" onClick={() => applyCORPreset(key)}>
              <strong>{preset.label}</strong>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* PENSION REFORM LEVERS */}
      <section className="controls-section">
        <h2>Parametres de reforme</h2>
        <div className="controls-grid">
          <SliderControl
            label="Age de depart en retraite"
            value={retirementAge} onChange={setRetirementAge}
            min={60} max={72} step={0.5} unit="ans" decimals={1}
            help="Age legal actuel: 64 ans. Chaque annee au-dela reduit la masse pension de 2,5%"
          />
          <SliderControl
            label="Desindexation"
            value={desindexation} onChange={setDesindexation}
            min={-1} max={2} step={0.1} unit="pt" decimals={1}
            help="Points de reduction de la revalorisation annuelle des pensions. Cumulatif: l'ecart se creuse chaque annee."
          />
          <SliderControl
            label="Plafonnement hautes pensions"
            value={pensionCap} onChange={setPensionCap}
            min={0} max={20} step={0.5} unit="%" decimals={1}
            help="Pourcentage de la masse pension plafonnee (hauts revenus)"
          />
          <div className="control">
            <div className="control-header"><label>Comptes notionnels (suedois)</label></div>
            <label className="reform-checkbox-label" style={{ marginTop: '8px' }}>
              <input type="checkbox" checked={notionnel} onChange={(e) => setNotionnel(e.target.checked)} />
              <span>Activer le systeme NDC (-6% masse pension, mise en place sur 15 ans a partir de 2027)</span>
            </label>
          </div>
        </div>
      </section>

      {/* LABOR REFORM (SENIOR EMPLOYMENT) */}
      <section className="controls-section">
        <h2>Reforme du marche du travail (emploi seniors)</h2>
        <p className="section-help">
          Les reformes du marche du travail augmentent le taux d'emploi des seniors (actuellement {(SENIOR_EMPLOYMENT.currentRate * 100).toFixed(0)}%, benchmark UE: {(SENIOR_EMPLOYMENT.euBenchmark * 100).toFixed(0)}%), generant des cotisations supplementaires.
        </p>
        <div className="reform-checkboxes">
          {['hartzIV', 'radicalFlex'].map(key => {
            const reform = STRUCTURAL_REFORMS[key]
            return (
              <label key={key} className="reform-checkbox-label">
                <input
                  type="radio"
                  name="laborReform"
                  checked={selectedLaborReform === key}
                  onChange={() => setSelectedLaborReform(selectedLaborReform === key ? null : key)}
                />
                <div className="reform-checkbox-content">
                  <strong>{reform.label}</strong>
                  <span className="reform-effect">
                    Croissance: +{(reform.growthEffect * 100).toFixed(2)}pp/an
                    &bull; Emploi seniors: +{(reform.seniorEmploymentGain * 100).toFixed(0)}pp
                  </span>
                  <span className="reform-details">Delai: {reform.lag} ans &bull; Duree: {reform.duration} ans</span>
                </div>
              </label>
            )
          })}
          {selectedLaborReform && (
            <button className="reform-clear-btn" onClick={() => setSelectedLaborReform(null)}>Aucune reforme</button>
          )}
        </div>
      </section>

      {/* HORIZON */}
      <section className="controls-section">
        <div className="controls-grid" style={{ maxWidth: '400px' }}>
          <SliderControl label="Horizon de projection" value={projectionYears} onChange={setProjectionYears} min={5} max={20} step={1} unit="ans" />
        </div>
      </section>

      {/* PENSION SAVINGS CHART */}
      <section className="results-section primary-chart-section">
        <h2>Economies pension sur {projectionYears} ans</h2>
        <div className="chart-container primary-chart">
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={projections.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis label={{ value: 'Md\u20ac', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pensionReformSaving" stroke="#2563eb" strokeWidth={3} name="Economies pension" dot={{ r: 2 }} />
              <Line type="monotone" dataKey="seniorRevenue" stroke="#16a34a" strokeWidth={2} name="Cotisations seniors" dot={false} />
              <Line type="monotone" dataKey="demographicPressure" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" name="Pression demographique" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* SMALL CHARTS ROW */}
      <section className="results-section">
        <h2>Trajectoires</h2>
        <div className="small-charts-row">
          {/* Cotisants/retraite */}
          <div className="small-chart-container">
            <h3 className="small-chart-title">Cotisants / retraite</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => v.toFixed(2)} />
                <ReferenceLine y={1.5} stroke="#e65100" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="baselineCotisantsPerRetraite" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                <Line type="monotone" dataKey="cotisantsPerRetraite" stroke="#0891b2" strokeWidth={2} name="Avec reforme" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Dette/PIB */}
          <div className="small-chart-container">
            <h3 className="small-chart-title">Dette / PIB (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line type="monotone" dataKey="baselineDebtRatio" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                <Line type="monotone" dataKey="debtRatio" stroke="#2563eb" strokeWidth={2} name="Avec reforme" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Deficit/PIB */}
          <div className="small-chart-container">
            <h3 className="small-chart-title">Deficit / PIB (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <ReferenceLine y={3} stroke="#e65100" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="baselineDeficitRatio" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                <Line type="monotone" dataKey="deficitRatio" stroke="#dc2626" strokeWidth={2} name="Avec reforme" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* KEY METRICS */}
      <section className="results-section">
        <h2>Indicateurs cles</h2>
        <div className="snapshot-row">
          {[yr5, yr10, yr20].filter((y, i, arr) => y <= projectionYears && arr.indexOf(y) === i).map(yr => (
            <div key={yr} className="snapshot-group">
              <h3 className="snapshot-label">Annee {yr} ({MACRO_BASELINE.year + yr})</h3>
              <div className="sustainability-metrics">
                <div className="sustainability-row">
                  <span>Economies pension :</span>
                  <span className="sustainability-value">{projections.reformScenario[yr]?.pensionReformSaving ?? 0} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Cotisations seniors :</span>
                  <span className="sustainability-value">{projections.reformScenario[yr]?.seniorRevenue ?? 0} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Pression demographique :</span>
                  <span className="sustainability-value negative">+{projections.reformScenario[yr]?.demographicPressure ?? 0} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Impact migration :</span>
                  <span className="sustainability-value">{projections.reformScenario[yr]?.migrationImpact ?? 0} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Pression dependance :</span>
                  <span className="sustainability-value negative">+{projections.reformScenario[yr]?.dependancePressure ?? 0} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Cotisants/retraite :</span>
                  <span className="sustainability-value">
                    {projections.chartData[yr]?.cotisantsPerRetraite?.toFixed(2) ?? '-'}
                  </span>
                </div>
                <div className="sustainability-row total">
                  <span><strong>Dette/PIB :</strong></span>
                  <span className="sustainability-value"><strong>{projections.reformScenario[yr]?.debtRatio ?? '-'}%</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DEMOGRAPHIC CONTEXT */}
      <section className="results-section">
        <h2>Contexte demographique</h2>
        <div className="demographic-context">
          <div className="demo-card">
            <h4>Vieillissement</h4>
            <p>Pression annuelle : <strong>+{DEMOGRAPHIC_PRESSURE_PER_YEAR.toFixed(1)} Md\u20ac/an</strong></p>
            <p>Derive ratio dependance : +{(DEMOGRAPHIC_PARAMS.dependencyRatioDriftPerYear * 100).toFixed(1)} pp/an</p>
            <p>Masse retraites : {DEMOGRAPHIC_PARAMS.pensionBaseline} Md\u20ac (elasticite {DEMOGRAPHIC_PARAMS.pensionElasticityToDependency})</p>
            <p>Masse sante : {DEMOGRAPHIC_PARAMS.healthBaseline} Md\u20ac (elasticite {DEMOGRAPHIC_PARAMS.healthElasticityToDependency})</p>
          </div>
          <div className="demo-card">
            <h4>Migration (brain drain)</h4>
            <p>Immigration : {MIGRATION_PARAMS.immigration.annualFlow.toLocaleString()} / an (taux emploi {(MIGRATION_PARAMS.immigration.employmentRate * 100).toFixed(0)}%)</p>
            <p>Emigration : {MIGRATION_PARAMS.emigration.annualFlow.toLocaleString()} / an (taux emploi {(MIGRATION_PARAMS.emigration.employmentRate * 100).toFixed(0)}%)</p>
            <p>Impact net : <strong>{(MIGRATION_NET_WORKERS_PER_YEAR * MIGRATION_PARAMS.avgCotisationsPerWorker / 1e9).toFixed(1)} Md\u20ac/an</strong></p>
          </div>
          <div className="demo-card">
            <h4>Dependance / autonomie</h4>
            <p>Depense actuelle : {DEPENDANCE_PARAMS.baseline} Md\u20ac</p>
            <p>Croissance : {(DEPENDANCE_PARAMS.annualGrowthRate * 100).toFixed(1)}%/an (vs PIB {(DEPENDANCE_PARAMS.gdpGrowthBaseline * 100).toFixed(1)}%)</p>
            <p>Surplus a 10 ans : ~{(DEPENDANCE_PARAMS.baseline * (Math.pow(1 + DEPENDANCE_PARAMS.annualGrowthRate, 10) - Math.pow(1 + DEPENDANCE_PARAMS.gdpGrowthBaseline, 10))).toFixed(0)} Md\u20ac</p>
          </div>
          <div className="demo-card">
            <h4>Emploi seniors</h4>
            <p>Taux actuel : {(SENIOR_EMPLOYMENT.currentRate * 100).toFixed(0)}% (benchmark UE: {(SENIOR_EMPLOYMENT.euBenchmark * 100).toFixed(0)}%)</p>
            <p>Population concernee : {(SENIOR_EMPLOYMENT.seniorPopulation / 1e6).toFixed(1)}M</p>
            <p>Cotisation moyenne : {SENIOR_EMPLOYMENT.avgCotisationsPerWorker.toLocaleString()} \u20ac/an</p>
          </div>
        </div>
      </section>
    </div>
  )
}
