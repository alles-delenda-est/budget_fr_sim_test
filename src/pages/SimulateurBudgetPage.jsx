import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, BarChart, Bar } from 'recharts'
import SliderControl from '../components/SliderControl'
import MetricCard from '../components/MetricCard'

import {
  MACRO_BASELINE,
  STRUCTURAL_REFORMS,
  SOCIAL_HOUSING_LIQUIDATION,
  PENSION_REFORM,
  projectFiscalPath,
  getBaselineProjection,
  assessDoomLoop,
  validateProjection,
} from '../projection-engine-v1.8'

import { BASELINE, PRESETS, PENSION_REFORM_PRESETS, calculatePolicyImpact, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from '../policy-impact'

// =============================================================================
// REFORM GROUPING
// =============================================================================

const HOUSING_REFORM_KEYS = ['housingModerate', 'housingRentControl', 'housingAmbitious']
const REFORM_GROUPS = [
  { label: "Marche du travail", keys: ['hartzIV', 'radicalFlex'] },
  { label: "Autre", keys: ['productMarketRegulation', 'education', 'energy'] },
  { label: "Paquets composites", keys: ['ambitious', 'modest'] },
]

export default function SimulateurBudgetPage() {
  // Etat policy levers
  const [incomeTaxChange, setIncomeTaxChange] = useState(0)
  const [vatChange, setVatChange] = useState(0)
  const [corpTaxChange, setCorpTaxChange] = useState(0)
  const [spendingEducation, setSpendingEducation] = useState(0)
  const [spendingDefense, setSpendingDefense] = useState(0)
  const [spendingSolidarity, setSpendingSolidarity] = useState(0)

  // Securite Sociale levers
  const [pensionIndexation, setPensionIndexation] = useState(0)
  const [healthSpending, setHealthSpending] = useState(0)
  const [socialContributions, setSocialContributions] = useState(0)
  const [csgRate, setCsgRate] = useState(0)

  // Pension reform levers
  const [retirementAge, setRetirementAge] = useState(64)
  const [desindexation, setDesindexation] = useState(0)
  const [pensionCap, setPensionCap] = useState(0)
  const [notionnel, setNotionnel] = useState(false)

  // Structural reforms
  const [selectedReforms, setSelectedReforms] = useState([])
  const [selectedHousingReform, setSelectedHousingReform] = useState(null)
  const [enableSocialHousingLiquidation, setEnableSocialHousingLiquidation] = useState(false)

  // Advanced
  const [politicalRisk, setPoliticalRisk] = useState(0)
  const [projectionYears, setProjectionYears] = useState(10)

  // Combined reform effect
  const combinedReformEffect = useMemo(() => {
    const allKeys = [...selectedReforms]
    if (selectedHousingReform) allKeys.push(selectedHousingReform)
    if (allKeys.length === 0) return null

    const totalGrowthEffect = allKeys.reduce((sum, key) => {
      return sum + STRUCTURAL_REFORMS[key].growthEffect
    }, 0) * 0.85

    const seniorReform = allKeys.find(k => STRUCTURAL_REFORMS[k].seniorEmploymentGain != null)
    const seniorEmploymentGain = seniorReform ? STRUCTURAL_REFORMS[seniorReform].seniorEmploymentGain : undefined

    return {
      label: `${allKeys.length} reformes combinees`,
      growthEffect: totalGrowthEffect,
      lag: Math.min(...allKeys.map(k => STRUCTURAL_REFORMS[k].lag)),
      duration: Math.max(...allKeys.map(k => STRUCTURAL_REFORMS[k].duration)),
      source: "Combinaison personnalisee",
      confidence: "variable",
      reforms: allKeys.map(k => STRUCTURAL_REFORMS[k].label),
      ...(seniorEmploymentGain != null ? { seniorEmploymentGain } : {}),
    }
  }, [selectedReforms, selectedHousingReform])

  const toggleReform = (reformKey) => {
    setSelectedReforms(prev =>
      prev.includes(reformKey)
        ? prev.filter(k => k !== reformKey)
        : [...prev, reformKey]
    )
  }

  const applyPreset = (presetKey) => {
    const preset = PRESETS[presetKey]
    if (!preset) return
    const { levers, reforms } = preset
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

    const housingReform = reforms.find(k => HOUSING_REFORM_KEYS.includes(k)) || null
    const checkboxReforms = reforms.filter(k => !HOUSING_REFORM_KEYS.includes(k))
    setSelectedReforms(checkboxReforms)
    setSelectedHousingReform(housingReform)
  }

  const applyCORPreset = (presetKey) => {
    const preset = PENSION_REFORM_PRESETS[presetKey]
    if (!preset) return
    const { pensionReform: pr } = preset
    setRetirementAge(pr.retirementAge)
    setDesindexation(pr.desindexation)
    setPensionCap(pr.pensionCap)
    setNotionnel(pr.notionnel)
  }

  // Policy impacts
  const policyImpact = useMemo(() => {
    return calculatePolicyImpact({
      incomeTaxChange, vatChange, corpTaxChange,
      spendingEducation, spendingDefense, spendingSolidarity,
      pensionIndexation, healthSpending, socialContributions, csgRate,
    })
  }, [incomeTaxChange, vatChange, corpTaxChange, spendingEducation, spendingDefense, spendingSolidarity, pensionIndexation, healthSpending, socialContributions, csgRate])

  const pensionReformOption = useMemo(() => {
    const isDefault = retirementAge === 64 && desindexation === 0 && pensionCap === 0 && !notionnel
    if (isDefault) return null
    return { retirementAge, desindexation, pensionCap, notionnel, capitalisation: 0 }
  }, [retirementAge, desindexation, pensionCap, notionnel])

  // Projections
  const projections = useMemo(() => {
    const baseline = getBaselineProjection(projectionYears)
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

    const chartData = fullScenario.map((item, i) => ({
      ...item,
      baselineDebtRatio: baseline[i]?.debtRatio,
      baselineDeficitRatio: baseline[i]?.deficitRatio,
      baselineNominalGrowthRate: baseline[i]?.nominalGrowthRate,
      baselineUnemploymentRate: baseline[i]?.unemploymentRate,
      cotisantsPerRetraite: PENSION_REFORM.cotisantsPerRetraite - (i * PENSION_REFORM.ratioDeclinePerYear)
        + ((pensionReformOption?.retirementAge ?? 64) - 64) * PENSION_REFORM.retirementAge.ratioImprovementPerYear
          * Math.min(i / PENSION_REFORM.retirementAge.rampUpYears, 1),
    }))

    return { baseline, fullScenario, chartData }
  }, [policyImpact, projectionYears, selectedReforms, selectedHousingReform, politicalRisk, combinedReformEffect, pensionReformOption, enableSocialHousingLiquidation])

  const doomLoopAssessment = useMemo(() => assessDoomLoop(projections.fullScenario), [projections.fullScenario])
  const validation = useMemo(() => validateProjection(projections.fullScenario), [projections.fullScenario])

  return (
    <div className="simulator-page">

      {/* DEBT PROJECTION CHART */}
      {projections.chartData && projections.chartData.length > 0 && (
        <section className="results-section primary-chart-section">
          <h2>Trajectoire dette publique sur {projectionYears} ans</h2>
          <div className="chart-container primary-chart">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Dette/PIB (%)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={60} stroke="#558b2f" strokeDasharray="3 3" label="Maastricht (60%)" />
                <ReferenceLine y={100} stroke="#e65100" strokeDasharray="3 3" label="Seuil alerte (100%)" />
                <Line type="monotone" dataKey="baselineDebtRatio" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline (PLF 2025)" dot={false} />
                <Line type="monotone" dataKey="debtRatio" stroke="#2563eb" strokeWidth={3} name="Scenario" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* SMALL CHARTS */}
      {projections.chartData && projections.chartData.length > 0 && (
        <section className="results-section">
          <h2>Trajectoires associees</h2>
          <div className="small-charts-row">
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
                  <Line type="monotone" dataKey="deficitRatio" stroke="#dc2626" strokeWidth={2} name="Scenario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container">
              <h3 className="small-chart-title">Croissance nominale (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="baselineNominalGrowthRate" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                  <Line type="monotone" dataKey="nominalGrowthRate" stroke="#16a34a" strokeWidth={2} name="Scenario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container">
              <h3 className="small-chart-title">Chomage (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="baselineUnemploymentRate" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                  <Line type="monotone" dataKey="unemploymentRate" stroke="#7c3aed" strokeWidth={2} name="Scenario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container">
              <h3 className="small-chart-title">Cotisants/retraite</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => v.toFixed(2)} />
                  <ReferenceLine y={1.5} stroke="#e65100" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="cotisantsPerRetraite" stroke="#0891b2" strokeWidth={2} name="Ratio" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* KEY METRICS — YEAR 1 */}
      {projections.fullScenario && projections.fullScenario.length > 0 && (
        <section className="results-section">
          <h2>Indicateurs cles (Annee 1)</h2>
          <div className="metrics-grid">
            <MetricCard label="Deficit annee 1" value={projections.fullScenario[0].deficit} unit="Md\u20ac" baseline={BASELINE.integrated.deficit} format="billions" />
            <MetricCard label="Dette/PIB" value={projections.fullScenario[0].debtRatio} unit="%" baseline={projections.baseline[0].debtRatio} format="percent" />
            <MetricCard label="Taux d'interet effectif" value={projections.fullScenario[0].effectiveInterestRate} unit="%" baseline={projections.baseline[0].effectiveInterestRate} format="percent" decimals={2} />
            <MetricCard label="Charge d'interets" value={projections.fullScenario[0].interest} unit="Md\u20ac" baseline={projections.baseline[0].interest} format="billions" />
          </div>
        </section>
      )}

      {/* SNAPSHOT METRICS — YEAR 5 & 10 */}
      {projections.fullScenario && projections.fullScenario.length >= 10 && (
        <section className="results-section">
          <h2>Instantanes a 5 ans et 10 ans</h2>
          <div className="snapshot-row">
            <div className="snapshot-group">
              <h3 className="snapshot-label">Annee 5 ({MACRO_BASELINE.year + 5})</h3>
              <div className="metrics-grid metrics-grid-3">
                <MetricCard label="Dette" value={projections.fullScenario[5].debt} unit="Md\u20ac" baseline={projections.baseline[5].debt} format="billions" decimals={0} />
                <MetricCard label="Deficit" value={projections.fullScenario[5].deficit} unit="Md\u20ac" baseline={projections.baseline[5].deficit} format="billions" decimals={0} />
                <MetricCard label="Interets" value={projections.fullScenario[5].interest} unit="Md\u20ac" baseline={projections.baseline[5].interest} format="billions" decimals={0} />
              </div>
            </div>
            <div className="snapshot-group">
              <h3 className="snapshot-label">Annee 10 ({MACRO_BASELINE.year + 10})</h3>
              <div className="metrics-grid metrics-grid-3">
                <MetricCard label="Dette" value={projections.fullScenario[10].debt} unit="Md\u20ac" baseline={projections.baseline[10].debt} format="billions" decimals={0} />
                <MetricCard label="Deficit" value={projections.fullScenario[10].deficit} unit="Md\u20ac" baseline={projections.baseline[10].deficit} format="billions" decimals={0} />
                <MetricCard label="Interets" value={projections.fullScenario[10].interest} unit="Md\u20ac" baseline={projections.baseline[10].interest} format="billions" decimals={0} />
              </div>

              <div className="sustainability-metrics">
                <h4>Soutenabilite retraites (An 10)</h4>
                <div className="sustainability-row">
                  <span>Cotisants/retraite :</span>
                  <span className="sustainability-value">
                    {(PENSION_REFORM.cotisantsPerRetraite - 10 * PENSION_REFORM.ratioDeclinePerYear
                      + ((pensionReformOption?.retirementAge ?? 64) - 64) * PENSION_REFORM.retirementAge.ratioImprovementPerYear
                        * Math.min(10 / PENSION_REFORM.retirementAge.rampUpYears, 1)).toFixed(2)}
                  </span>
                </div>
                <div className="sustainability-row">
                  <span>Economies retraites :</span>
                  <span className="sustainability-value">{projections.fullScenario[10].pensionReformSaving} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Impact migration :</span>
                  <span className="sustainability-value">{projections.fullScenario[10].migrationImpact} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Pression dependance :</span>
                  <span className="sustainability-value">+{projections.fullScenario[10].dependancePressure} Md\u20ac</span>
                </div>
                {enableSocialHousingLiquidation && (
                  <div className="sustainability-row">
                    <span>Cession HLM (an 10) :</span>
                    <span className="sustainability-value">{projections.fullScenario[10].socialHousingWindfall} Md\u20ac</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRESET BUTTONS */}
      <section className="controls-section preset-section">
        <h2>Scenarios politiques</h2>
        <p className="section-help">Charger un budget politique complet (taxes + depenses + reformes)</p>
        <div className="preset-grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button key={key} className="preset-btn" onClick={() => applyPreset(key)}>
              <strong>{preset.label}</strong>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
        <div className="preset-note">Les boutons ci-dessus configurent tous les leviers automatiquement</div>
      </section>

      {/* TAX LEVERS */}
      <section className="controls-section">
        <h2>Leviers fiscaux (Etat)</h2>
        <div className="controls-grid">
          <SliderControl label="Impot sur le revenu" value={incomeTaxChange} onChange={setIncomeTaxChange} min={-10} max={10} step={1} unit="pp" />
          <SliderControl label="TVA" value={vatChange} onChange={setVatChange} min={-5} max={5} step={0.5} unit="pp" />
          <SliderControl label="Impot sur les societes" value={corpTaxChange} onChange={setCorpTaxChange} min={-10} max={5} step={1} unit="pp" />
        </div>
      </section>

      {/* SPENDING LEVERS */}
      <section className="controls-section">
        <h2>Depenses publiques (Etat)</h2>
        <div className="controls-grid">
          <SliderControl label="Enseignement scolaire" value={spendingEducation} onChange={setSpendingEducation} min={-20} max={20} step={1} unit="%" />
          <SliderControl label="Defense" value={spendingDefense} onChange={setSpendingDefense} min={-15} max={15} step={1} unit="%" />
          <SliderControl label="Solidarite & insertion" value={spendingSolidarity} onChange={setSpendingSolidarity} min={-30} max={30} step={1} unit="%" />
        </div>
      </section>

      {/* SOCIAL SECURITY */}
      <section className="controls-section ss-section">
        <h2>Leviers Securite Sociale (PLFSS 2026)</h2>
        <p className="section-help">Ajustements des recettes et depenses de la securite sociale</p>
        <div className="controls-grid">
          <div className="control-with-refs">
            <SliderControl label="Indexation retraites" value={pensionIndexation} onChange={setPensionIndexation} min={-2} max={1} step={0.1} unit="pp vs inflation" decimals={1} />
            <div className="policy-refs">
              <h4>References politiques :</h4>
              <div className="ref-item"><strong>PLFSS 2025:</strong> Gel Jan-Jul = -3.6 Md\u20ac</div>
              <div className="ref-item"><strong>PLFSS 2026:</strong> Gel total = -2.9 Md\u20ac</div>
            </div>
          </div>
          <div className="control-with-refs">
            <SliderControl label="Depenses sante (ONDAM)" value={healthSpending} onChange={setHealthSpending} min={-10} max={10} step={1} unit="%" />
            {policyImpact.ondamWarning && (
              <div className={`ondam-warning ondam-${policyImpact.ondamWarningLevel}`}>
                <strong>Contrainte ONDAM :</strong> Coupe demandee {healthSpending}% &rarr; effective {policyImpact.ondamEffectiveCut.toFixed(1)}%
                <br /><small>Deserts medicaux, urgences saturees — rendements decroissants au-dela de -3%</small>
              </div>
            )}
          </div>
          <SliderControl label="Cotisations sociales" value={socialContributions} onChange={setSocialContributions} min={-5} max={5} step={0.5} unit="pp" />
          <SliderControl label="CSG (Contribution Sociale Generalisee)" value={csgRate} onChange={setCsgRate} min={-2} max={2} step={0.5} unit="pp" />
        </div>
        <div className="ss-context">
          <h4>Contexte PLFSS 2026 :</h4>
          <ul>
            <li><strong>Deficit prevu :</strong> -19.4 Md\u20ac (vs -17.5 Md\u20ac initial)</li>
            <li><strong>ONDAM :</strong> 274.4 Md\u20ac (+3.1%, vs +1.6% initial)</li>
            <li><strong>CSG capital :</strong> +1.5 Md\u20ac (9.2% &rarr; 10.6%)</li>
            <li><strong>Mesures abandonnees :</strong> Gel retraites, franchises medicales (-2.3 Md\u20ac)</li>
          </ul>
        </div>
      </section>

      {/* PENSION REFORM */}
      <section className="controls-section ss-section">
        <h2>Reforme des retraites (francetdb.com)</h2>
        <p className="section-help">Reformes structurelles du systeme de retraites — effets dynamiques sur {projectionYears} ans</p>
        <div className="preset-grid">
          {Object.entries(PENSION_REFORM_PRESETS).map(([key, preset]) => (
            <button key={key} className="preset-btn preset-btn-sm" onClick={() => applyCORPreset(key)}>
              <strong>{preset.label}</strong>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
        <div className="controls-grid">
          <SliderControl label="Age de depart en retraite" value={retirementAge} onChange={setRetirementAge} min={60} max={72} step={0.5} unit="ans" decimals={1} help="Age legal actuel: 64 ans. Chaque annee au-dela reduit la masse pension de 2,5%" />
          <SliderControl label="Desindexation" value={desindexation} onChange={setDesindexation} min={-1} max={2} step={0.1} unit="pt" decimals={1} help="Points de reduction de la revalorisation annuelle des pensions" />
          <SliderControl label="Plafonnement hautes pensions" value={pensionCap} onChange={setPensionCap} min={0} max={20} step={0.5} unit="%" decimals={1} help="Pourcentage de la masse pension plafonnee" />
          <div className="control">
            <div className="control-header"><label>Comptes notionnels (suedois)</label></div>
            <label className="reform-checkbox-label" style={{ marginTop: '8px' }}>
              <input type="checkbox" checked={notionnel} onChange={(e) => setNotionnel(e.target.checked)} />
              <span>Activer le systeme de comptes notionnels (-6% masse pension sur 15 ans)</span>
            </label>
          </div>
        </div>
        {pensionReformOption && projections.fullScenario && projections.fullScenario.length > 10 && (
          <div className="combined-reforms-summary">
            <h4>Impact reforme retraites :</h4>
            <div className="combined-effect">
              <strong>Economie pension (Annee 10) :</strong> {projections.fullScenario[10].pensionReformSaving} Md\u20ac
            </div>
          </div>
        )}
      </section>

      {/* STRUCTURAL REFORMS */}
      <section className="controls-section">
        <h2>Reformes structurelles</h2>
        <p className="section-help">Selectionner plusieurs reformes (effet cumulatif avec penalite de 15% pour chevauchements). Les reformes logement sont mutuellement exclusives (radio).</p>
        {REFORM_GROUPS.map(group => (
          <div key={group.label} className="reform-group">
            <h4 className="reform-group-title">{group.label}</h4>
            <div className="reform-checkboxes">
              {group.keys.filter(k => STRUCTURAL_REFORMS[k]).map(key => {
                const reform = STRUCTURAL_REFORMS[key]
                return (
                  <label key={key} className="reform-checkbox-label">
                    <input type="checkbox" checked={selectedReforms.includes(key)} onChange={() => toggleReform(key)} />
                    <div className="reform-checkbox-content">
                      <strong>{reform.label}</strong>
                      <span className="reform-effect">+{(reform.growthEffect * 100).toFixed(2)}pp/an</span>
                      <span className="reform-details">
                        Delai: {reform.lag} ans &bull; Duree: {reform.duration} ans
                        {reform.seniorEmploymentGain != null && ` \u2022 Emploi seniors: +${(reform.seniorEmploymentGain * 100).toFixed(0)}pp`}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
        <div className="reform-group">
          <h4 className="reform-group-title">Logement / Urbanisme</h4>
          <div className="reform-checkboxes">
            {HOUSING_REFORM_KEYS.map(key => {
              const reform = STRUCTURAL_REFORMS[key]
              return (
                <label key={key} className="reform-checkbox-label">
                  <input type="radio" name="housingReform" checked={selectedHousingReform === key} onChange={() => setSelectedHousingReform(selectedHousingReform === key ? null : key)} />
                  <div className="reform-checkbox-content">
                    <strong>{reform.label}</strong>
                    <span className="reform-effect">+{(reform.growthEffect * 100).toFixed(2)}pp/an</span>
                    <span className="reform-details">Delai: {reform.lag} ans &bull; Duree: {reform.duration} ans</span>
                  </div>
                </label>
              )
            })}
            {selectedHousingReform && (
              <button className="reform-clear-btn" onClick={() => setSelectedHousingReform(null)}>Aucune reforme logement</button>
            )}
          </div>
          <label className="reform-checkbox-label" style={{ marginTop: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            <input type="checkbox" checked={enableSocialHousingLiquidation} onChange={(e) => setEnableSocialHousingLiquidation(e.target.checked)} />
            <div className="reform-checkbox-content">
              <strong>Liquidation parc HLM</strong>
              <span className="reform-effect">{SOCIAL_HOUSING_LIQUIDATION.annualProceeds} Md\u20ac/an pendant {SOCIAL_HOUSING_LIQUIDATION.saleDurationYears} ans</span>
              <span className="reform-details">Actif total: {SOCIAL_HOUSING_LIQUIDATION.totalAssetValue} Md\u20ac &bull; {SOCIAL_HOUSING_LIQUIDATION.source}</span>
            </div>
          </label>
        </div>
        {(selectedReforms.length > 0 || selectedHousingReform) && combinedReformEffect && (
          <div className="combined-reforms-summary">
            <h4>Reformes selectionnees :</h4>
            <ul className="combined-reforms-list">
              {combinedReformEffect.reforms.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="combined-effect">
              <strong>Effet croissance combine :</strong> +{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an
              <br /><small>(delai min: {combinedReformEffect.lag} ans, duree max: {combinedReformEffect.duration} ans)</small>
            </div>
          </div>
        )}
      </section>

      {/* ADVANCED */}
      <section className="controls-section">
        <h2>Parametres avances</h2>
        <div className="controls-grid">
          <SliderControl label="Prime de risque politique (additionnelle)" value={politicalRisk} onChange={setPoliticalRisk} min={0} max={200} step={10} unit="bps" help="Prime ADDITIONNELLE au-dela des 21 bps deja integres (crise politique 2024)" />
          <SliderControl label="Horizon de projection" value={projectionYears} onChange={setProjectionYears} min={5} max={20} step={1} unit="ans" />
        </div>
      </section>

      {/* BUDGET BREAKDOWN */}
      {projections.fullScenario && projections.fullScenario.length > 0 && (
        <section className="results-section">
          <h2>Decomposition du deficit (Annee 1)</h2>
          <div className="budget-breakdown">
            <div className="breakdown-row">
              <span>Etat seul :</span>
              <span className="breakdown-value">{(BASELINE.etat.deficit + policyImpact.etat.revenue - policyImpact.etat.spending).toFixed(1)} Md\u20ac</span>
            </div>
            <div className="breakdown-row">
              <span>Securite sociale :</span>
              <span className="breakdown-value">{(BASELINE.securiteSociale.deficit + policyImpact.ss.revenue - policyImpact.ss.spending).toFixed(1)} Md\u20ac</span>
            </div>
            <div className="breakdown-row total">
              <span><strong>Total APU :</strong></span>
              <span className="breakdown-value"><strong>{projections.fullScenario[0].deficit.toFixed(1)} Md\u20ac</strong></span>
            </div>
          </div>
        </section>
      )}

      {/* POLICY IMPACT CHART */}
      {(policyImpact.revenueChange !== 0 || policyImpact.spendingChange !== 0) && (
        <section className="results-section">
          <h2>Impact des leviers budgetaires</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Impact', 'Recettes': policyImpact.revenueChange, 'Depenses': -policyImpact.spendingChange, 'Solde': policyImpact.revenueChange - policyImpact.spendingChange }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Milliards \u20ac', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Recettes" fill="#10b981" />
                <Bar dataKey="Depenses" fill="#ef4444" />
                <Bar dataKey="Solde" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {(selectedReforms.length > 0 || selectedHousingReform) && combinedReformEffect && (
            <div className="reform-impact-note">
              <p><strong>{combinedReformEffect.reforms.length} reforme(s) structurelle(s)</strong> activee(s) avec effet croissance de <strong>+{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an</strong></p>
              <p className="reform-list">{combinedReformEffect.reforms.join(' \u2022 ')}</p>
            </div>
          )}
        </section>
      )}

      {/* DOOM LOOP */}
      {doomLoopAssessment.doomLoopActive && (
        <section className="results-section warning-section">
          <h2>Alerte : Risque de "Doom Loop"</h2>
          <div className="doom-loop-warning">
            <p><strong>Severite : {doomLoopAssessment.severity === 'high' ? 'Elevee' : doomLoopAssessment.severity === 'medium' ? 'Moyenne' : 'Faible'}</strong></p>
            <ul>
              <li>Variation ratio dette/PIB : +{doomLoopAssessment.debtRatioChange} pp</li>
              <li>Variation ratio interets/PIB : +{doomLoopAssessment.interestRatioChange} pp</li>
              <li>Augmentation prime de risque : +{doomLoopAssessment.premiumIncreaseBps} bps</li>
            </ul>
            <p className="doom-loop-explanation">Un "doom loop" se produit quand la dette elevee augmente les taux d'interet, ce qui augmente la dette, creant un cercle vicieux.</p>
          </div>
        </section>
      )}

      {/* VALIDATION */}
      {projections.fullScenario && !validation.valid && (
        <section className="results-section validation-section">
          <h2>Avertissements de validation</h2>
          <ul className="validation-warnings">
            {validation.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
          </ul>
        </section>
      )}
    </div>
  )
}
