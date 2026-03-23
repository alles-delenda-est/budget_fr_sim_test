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
  { label: "Marché du travail", keys: ['hartzIV', 'radicalFlex'] },
  { label: "Autre", keys: ['productMarketRegulation', 'education', 'energy'] },
  { label: "Paquets composites", keys: ['ambitious', 'modest'] },
]

export default function SimulateurBudgetPage() {
  // État policy levers
  const [incomeTaxChange, setIncomeTaxChange] = useState(0)
  const [vatChange, setVatChange] = useState(0)
  const [corpTaxChange, setCorpTaxChange] = useState(0)
  const [spendingEducation, setSpendingEducation] = useState(0)
  const [spendingDefense, setSpendingDefense] = useState(0)
  const [spendingSolidarity, setSpendingSolidarity] = useState(0)

  // Sécurité Sociale levers
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

  // COR macro override (growth rate)
  const [realGrowthOverride, setRealGrowthOverride] = useState(null)

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

  const toggleReform = (reformKey) => {
    setSelectedReforms(prev =>
      prev.includes(reformKey)
        ? prev.filter(k => k !== reformKey)
        : [...prev, reformKey]
    )
  }

  const resetAll = () => {
    setIncomeTaxChange(0)
    setVatChange(0)
    setCorpTaxChange(0)
    setSpendingEducation(0)
    setSpendingDefense(0)
    setSpendingSolidarity(0)
    setPensionIndexation(0)
    setHealthSpending(0)
    setSocialContributions(0)
    setCsgRate(0)
    setRetirementAge(64)
    setDesindexation(0)
    setPensionCap(0)
    setNotionnel(false)
    setSelectedReforms([])
    setSelectedHousingReform(null)
    setEnableSocialHousingLiquidation(false)
    setPoliticalRisk(0)
    setRealGrowthOverride(null)
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
    const { pensionReform: pr, macroOverrides } = preset
    setRetirementAge(pr.retirementAge)
    setDesindexation(pr.desindexation)
    setPensionCap(pr.pensionCap)
    setNotionnel(pr.notionnel)
    setRealGrowthOverride(macroOverrides?.realGrowth ?? null)
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
      realGrowthOverride,
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
  }, [policyImpact, projectionYears, selectedReforms, selectedHousingReform, politicalRisk, combinedReformEffect, pensionReformOption, enableSocialHousingLiquidation, realGrowthOverride])

  const doomLoopAssessment = useMemo(() => assessDoomLoop(projections.fullScenario), [projections.fullScenario])
  const validation = useMemo(() => validateProjection(projections.fullScenario), [projections.fullScenario])

  return (
    <div className="simulator-page">

      {/* DEBT PROJECTION CHART */}
      {projections.chartData && projections.chartData.length > 0 && (
        <section className="results-section primary-chart-section">
          <h2>Trajectoire dette publique sur {projectionYears} ans</h2>
          <div className="chart-container primary-chart" role="img" aria-label={`Graphique : Trajectoire dette publique. Scénario : ${projections.fullScenario[projections.fullScenario.length - 1]?.debtRatio}% dette/PIB en ${projections.fullScenario[projections.fullScenario.length - 1]?.year}, contre ${projections.baseline[projections.baseline.length - 1]?.debtRatio}% en baseline.`}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={projections.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis label={{ value: 'Dette/PIB (%)', angle: -90, position: 'insideLeft' }} domain={['auto', 'auto']} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={60} stroke="#2e7d32" strokeDasharray="3 3" label="Maastricht (60%)" />
                <ReferenceLine y={100} stroke="#bf4000" strokeDasharray="3 3" label="Seuil alerte (100%)" />
                <Line type="monotone" dataKey="baselineDebtRatio" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline (PLF 2025)" dot={false} />
                <Line type="monotone" dataKey="debtRatio" stroke="#2563eb" strokeWidth={3} name="Scénario" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* SMALL CHARTS */}
      {projections.chartData && projections.chartData.length > 0 && (
        <section className="results-section">
          <h2>Trajectoires associées</h2>
          <div className="small-charts-row">
            <div className="small-chart-container" role="img" aria-label={`Graphique : Déficit/PIB. Scénario : ${projections.fullScenario[projections.fullScenario.length - 1]?.deficitRatio}% en fin de période.`}>
              <h3 className="small-chart-title">Déficit / PIB (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <ReferenceLine y={3} stroke="#bf4000" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="baselineDeficitRatio" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                  <Line type="monotone" dataKey="deficitRatio" stroke="#dc2626" strokeWidth={2} name="Scénario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container" role="img" aria-label={`Graphique : Croissance nominale. Scénario : ${projections.fullScenario[projections.fullScenario.length - 1]?.nominalGrowthRate}% en fin de période.`}>
              <h3 className="small-chart-title">Croissance nominale (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="baselineNominalGrowthRate" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                  <Line type="monotone" dataKey="nominalGrowthRate" stroke="#16a34a" strokeWidth={2} name="Scénario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container" role="img" aria-label={`Graphique : Chômage. Scénario : ${projections.fullScenario[projections.fullScenario.length - 1]?.unemploymentRate}% en fin de période.`}>
              <h3 className="small-chart-title">Chômage (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="baselineUnemploymentRate" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Baseline" dot={false} />
                  <Line type="monotone" dataKey="unemploymentRate" stroke="#7c3aed" strokeWidth={2} name="Scénario" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="small-chart-container" role="img" aria-label={`Graphique : Ratio cotisants/retraité. ${projections.chartData[projections.chartData.length - 1]?.cotisantsPerRetraite?.toFixed(2)} en fin de période.`}>
              <h3 className="small-chart-title">Cotisants/retraité</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={projections.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => v.toFixed(2)} />
                  <ReferenceLine y={1.5} stroke="#bf4000" strokeDasharray="3 3" />
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
          <h2>Indicateurs clés (Année 1)</h2>
          <div className="metrics-grid">
            <MetricCard label="Déficit année 1" value={projections.fullScenario[0].deficit} unit="Md\u20ac" baseline={BASELINE.integrated.deficit} format="billions" invertSign />
            <MetricCard label="Dette/PIB" value={projections.fullScenario[0].debtRatio} unit="%" baseline={projections.baseline[0].debtRatio} format="percent" />
            <MetricCard label="Taux d'intérêt effectif" value={projections.fullScenario[0].effectiveInterestRate} unit="%" baseline={projections.baseline[0].effectiveInterestRate} format="percent" decimals={2} />
            <MetricCard label="Charge d'intérêts" value={projections.fullScenario[0].interest} unit="Md\u20ac" baseline={projections.baseline[0].interest} format="billions" />
          </div>
        </section>
      )}

      {/* SNAPSHOT METRICS — YEAR 5 & 10 */}
      {projections.fullScenario && projections.fullScenario.length >= 10 && (
        <section className="results-section">
          <h2>Instantanés à 5 ans et 10 ans</h2>
          <div className="snapshot-row">
            <div className="snapshot-group">
              <h3 className="snapshot-label">Année 5 ({MACRO_BASELINE.year + 5})</h3>
              <div className="metrics-grid metrics-grid-3">
                <MetricCard label="Dette" value={projections.fullScenario[5].debt} unit="Md\u20ac" baseline={projections.baseline[5].debt} format="billions" decimals={0} />
                <MetricCard label="Déficit" value={projections.fullScenario[5].deficit} unit="Md\u20ac" baseline={projections.baseline[5].deficit} format="billions" decimals={0} invertSign />
                <MetricCard label="Intérêts" value={projections.fullScenario[5].interest} unit="Md\u20ac" baseline={projections.baseline[5].interest} format="billions" decimals={0} />
              </div>
            </div>
            <div className="snapshot-group">
              <h3 className="snapshot-label">Année 10 ({MACRO_BASELINE.year + 10})</h3>
              <div className="metrics-grid metrics-grid-3">
                <MetricCard label="Dette" value={projections.fullScenario[10].debt} unit="Md\u20ac" baseline={projections.baseline[10].debt} format="billions" decimals={0} />
                <MetricCard label="Déficit" value={projections.fullScenario[10].deficit} unit="Md\u20ac" baseline={projections.baseline[10].deficit} format="billions" decimals={0} invertSign />
                <MetricCard label="Intérêts" value={projections.fullScenario[10].interest} unit="Md\u20ac" baseline={projections.baseline[10].interest} format="billions" decimals={0} />
              </div>

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
                  <span>Économies retraites :</span>
                  <span className="sustainability-value">{projections.fullScenario[10].pensionReformSaving} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Impact migration :</span>
                  <span className="sustainability-value">{projections.fullScenario[10].migrationImpact} Md\u20ac</span>
                </div>
                <div className="sustainability-row">
                  <span>Pression dépendance :</span>
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
        <h2>Scénarios politiques</h2>
        <p className="section-help">Charger un budget politique complet (taxes + dépenses + réformes)</p>
        <div className="preset-grid">
          {Object.entries(PRESETS).map(([key, preset]) => (
            <button key={key} className="preset-btn" onClick={() => applyPreset(key)}>
              <strong>{preset.label}</strong>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
          <button className="preset-btn" onClick={resetAll} style={{ borderColor: 'var(--color-ink-muted)' }}>
            <strong>Réinitialiser</strong>
            <span className="preset-desc">Remettre tous les leviers à zéro</span>
          </button>
        </div>
        <div className="preset-note">Les boutons ci-dessus configurent tous les leviers automatiquement</div>
      </section>

      {/* TAX LEVERS */}
      <section className="controls-section">
        <h2>Leviers fiscaux (État)</h2>
        <div className="controls-grid">
          <SliderControl label="Impôt sur le revenu" value={incomeTaxChange} onChange={setIncomeTaxChange} min={-10} max={10} step={1} unit="pp" />
          <SliderControl label="TVA" value={vatChange} onChange={setVatChange} min={-5} max={5} step={0.5} unit="pp" />
          <SliderControl label="Impôt sur les sociétés" value={corpTaxChange} onChange={setCorpTaxChange} min={-10} max={5} step={1} unit="pp" />
        </div>
      </section>

      {/* SPENDING LEVERS */}
      <section className="controls-section">
        <h2>Dépenses publiques (État)</h2>
        <div className="controls-grid">
          <SliderControl label="Enseignement scolaire" value={spendingEducation} onChange={setSpendingEducation} min={-20} max={20} step={1} unit="%" />
          <SliderControl label="Défense" value={spendingDefense} onChange={setSpendingDefense} min={-15} max={15} step={1} unit="%" />
          <SliderControl label="Solidarité & insertion" value={spendingSolidarity} onChange={setSpendingSolidarity} min={-60} max={30} step={1} unit="%" help="Plage étendue (-60%) pour couvrir le scénario Knafo" />
        </div>
      </section>

      {/* SOCIAL SECURITY */}
      <section className="controls-section ss-section">
        <h2>Leviers Sécurité Sociale (PLFSS 2026)</h2>
        <p className="section-help">Ajustements des recettes et dépenses de la sécurité sociale</p>
        <div className="controls-grid">
          <div className="control-with-refs">
            <SliderControl label="Indexation retraites" value={pensionIndexation} onChange={setPensionIndexation} min={-2} max={1} step={0.1} unit="pp vs inflation" decimals={1} />
            <div className="policy-refs">
              <h4>Références politiques :</h4>
              <div className="ref-item"><strong>PLFSS 2025:</strong> Gel Jan-Jul = -3.6 Md\u20ac</div>
              <div className="ref-item"><strong>PLFSS 2026:</strong> Gel total = -2.9 Md\u20ac</div>
            </div>
          </div>
          <div className="control-with-refs">
            <SliderControl label="Dépenses santé (ONDAM)" value={healthSpending} onChange={setHealthSpending} min={-10} max={10} step={1} unit="%" />
            {policyImpact.ondamWarning && (
              <div className={`ondam-warning ondam-${policyImpact.ondamWarningLevel}`}>
                <strong>Contrainte ONDAM :</strong> Coupe demandée {healthSpending}% &rarr; effective {policyImpact.ondamEffectiveCut.toFixed(1)}%
                <br /><small>Déserts médicaux, urgences saturées — rendements décroissants au-delà de -3%</small>
              </div>
            )}
          </div>
          <SliderControl label="Cotisations sociales" value={socialContributions} onChange={setSocialContributions} min={-5} max={5} step={0.5} unit="pp" />
          <SliderControl label="CSG (Contribution Sociale Généralisée)" value={csgRate} onChange={setCsgRate} min={-2} max={2} step={0.5} unit="pp" />
        </div>
        <div className="ss-context">
          <h4>Contexte PLFSS 2026 :</h4>
          <ul>
            <li><strong>Déficit prévu :</strong> -19.4 Md\u20ac (vs -17.5 Md\u20ac initial)</li>
            <li><strong>ONDAM :</strong> 274.4 Md\u20ac (+3.1%, vs +1.6% initial)</li>
            <li><strong>CSG capital :</strong> +1.5 Md\u20ac (9.2% &rarr; 10.6%)</li>
            <li><strong>Mesures abandonnées :</strong> Gel retraites, franchises médicales (-2.3 Md\u20ac)</li>
          </ul>
        </div>
      </section>

      {/* PENSION REFORM */}
      <section className="controls-section ss-section">
        <h2>Réforme des retraites (francetdb.com)</h2>
        <p className="section-help">Réformes structurelles du système de retraites — effets dynamiques sur {projectionYears} ans</p>
        <div className="preset-grid">
          {Object.entries(PENSION_REFORM_PRESETS).map(([key, preset]) => (
            <button key={key} className="preset-btn preset-btn-sm" onClick={() => applyCORPreset(key)}>
              <strong>{preset.label}</strong>
              <span className="preset-desc">{preset.description}</span>
            </button>
          ))}
        </div>
        <div className="controls-grid">
          <SliderControl label="Âge de départ en retraite" value={retirementAge} onChange={setRetirementAge} min={60} max={72} step={0.5} unit="ans" decimals={1} help="Âge légal actuel: 64 ans. Chaque année au-delà réduit la masse pension de 2,5%" />
          <SliderControl label="Désindexation" value={desindexation} onChange={setDesindexation} min={-1} max={2} step={0.1} unit="pt" decimals={1} help="Points de réduction de la revalorisation annuelle des pensions" />
          <SliderControl label="Plafonnement hautes pensions" value={pensionCap} onChange={setPensionCap} min={0} max={20} step={0.5} unit="%" decimals={1} help="Pourcentage de la masse pension plafonnée" />
          <div className="control">
            <div className="control-header"><label>Comptes notionnels (suédois)</label></div>
            <label className="reform-checkbox-label" style={{ marginTop: '8px' }}>
              <input type="checkbox" checked={notionnel} onChange={(e) => setNotionnel(e.target.checked)} />
              <span>Activer le système de comptes notionnels (-6% masse pension sur 15 ans)</span>
            </label>
          </div>
        </div>
        {pensionReformOption && projections.fullScenario && projections.fullScenario.length > 10 && (
          <div className="combined-reforms-summary">
            <h4>Impact réforme retraites :</h4>
            <div className="combined-effect">
              <strong>Économie pension (Année 10) :</strong> {projections.fullScenario[10].pensionReformSaving} Md\u20ac
            </div>
          </div>
        )}
      </section>

      {/* STRUCTURAL REFORMS */}
      <section className="controls-section">
        <h2>Réformes structurelles</h2>
        <p className="section-help">Sélectionner plusieurs réformes (effet cumulatif avec pénalité de 15% pour chevauchements). Les réformes logement sont mutuellement exclusives (radio).</p>
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
                        Délai: {reform.lag} ans &bull; Durée: {reform.duration} ans
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
                    <span className="reform-details">Délai: {reform.lag} ans &bull; Durée: {reform.duration} ans</span>
                  </div>
                </label>
              )
            })}
            {selectedHousingReform && (
              <button className="reform-clear-btn" onClick={() => setSelectedHousingReform(null)}>Aucune réforme logement</button>
            )}
          </div>
          <label className="reform-checkbox-label" style={{ marginTop: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
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
            <h4>Réformes sélectionnées :</h4>
            <ul className="combined-reforms-list">
              {combinedReformEffect.reforms.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="combined-effect">
              <strong>Effet croissance combiné :</strong> +{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an
              <br /><small>(délai min: {combinedReformEffect.lag} ans, durée max: {combinedReformEffect.duration} ans)</small>
            </div>
          </div>
        )}
      </section>

      {/* ADVANCED */}
      <section className="controls-section">
        <h2>Paramètres avancés</h2>
        <div className="controls-grid">
          <SliderControl label="Prime de risque politique (additionnelle)" value={politicalRisk} onChange={setPoliticalRisk} min={0} max={200} step={10} unit="bps" help="Prime ADDITIONNELLE au-delà des 21 bps déjà intégrés (crise politique 2024)" />
          <SliderControl label="Horizon de projection" value={projectionYears} onChange={setProjectionYears} min={5} max={20} step={1} unit="ans" />
        </div>
      </section>

      {/* BUDGET BREAKDOWN */}
      {projections.fullScenario && projections.fullScenario.length > 0 && (
        <section className="results-section">
          <h2>Décomposition du déficit (Année 1)</h2>
          <div className="budget-breakdown">
            <div className="breakdown-row">
              <span>État seul :</span>
              <span className="breakdown-value">{(BASELINE.etat.deficit + policyImpact.etat.revenue - policyImpact.etat.spending).toFixed(1)} Md\u20ac</span>
            </div>
            <div className="breakdown-row">
              <span>Sécurité sociale :</span>
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
          <h2>Impact des leviers budgétaires</h2>
          <div className="chart-container" role="img" aria-label={`Graphique : Impact budgétaire. Recettes : ${policyImpact.revenueChange.toFixed(1)} Md€, Dépenses : ${(-policyImpact.spendingChange).toFixed(1)} Md€, Solde : ${(policyImpact.revenueChange - policyImpact.spendingChange).toFixed(1)} Md€.`}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[{ name: 'Impact', 'Recettes': policyImpact.revenueChange, 'Dépenses': -policyImpact.spendingChange, 'Solde': policyImpact.revenueChange - policyImpact.spendingChange }]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Milliards \u20ac', angle: -90, position: 'insideLeft' }} />
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
              <p><strong>{combinedReformEffect.reforms.length} réforme(s) structurelle(s)</strong> activée(s) avec effet croissance de <strong>+{(combinedReformEffect.growthEffect * 100).toFixed(2)}pp/an</strong></p>
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
            <p><strong>Sévérité : {doomLoopAssessment.severity === 'high' ? 'Élevée' : doomLoopAssessment.severity === 'medium' ? 'Moyenne' : 'Faible'}</strong></p>
            <ul>
              <li>Variation ratio dette/PIB : +{doomLoopAssessment.debtRatioChange} pp</li>
              <li>Variation ratio intérêts/PIB : +{doomLoopAssessment.interestRatioChange} pp</li>
              <li>Augmentation prime de risque : +{doomLoopAssessment.premiumIncreaseBps} bps</li>
            </ul>
            <p className="doom-loop-explanation">Un "doom loop" se produit quand la dette élevée augmente les taux d'intérêt, ce qui augmente la dette, créant un cercle vicieux.</p>
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
