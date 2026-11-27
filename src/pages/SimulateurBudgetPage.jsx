import { useState, useMemo, useEffect, useCallback, useDeferredValue } from 'react'
import { projectScenario, HORIZONS, START_YEAR } from '../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../engine/params.js'
import LeverPanel from './budget/LeverPanel'
import Charts from './budget/Charts'
import { Snapshots, DecompositionTable, BlocksTable, WarningBanner, ComparisonBanner } from './budget/Results'
import IncidencePanel from './budget/IncidencePanel'
import { computeIncidenceAtYear } from './budget/incidence'
import { evaluateWarnings } from './budget/warnings'
import ShareButton from './budget/ShareButton'
import { buildCsv, buildExportRows, downloadCsv, COLUMNS_VS_A } from './budget/exportCsv'
import { buildBriefData, formatBriefMarkdown, downloadMarkdown } from './budget/exportBrief'
import { PolicyBriefPrint, CopyBriefButton } from './budget/PolicyBriefPrint'
import { STRESS_TESTS, resolveStressConfig } from './budget/stressTests'
import { versionStamp } from '../version'
import { decodeScenario, queryFromHash, scenarioHash, scenarioUrl, DEFAULT_LVT, DEFAULT_REGIME, DEFAULT_PHASING } from './budget/share'
import { LvtModuleControl, LvtModuleResults } from './budget/LvtModule'
import { LVT_MODULE, LVT_PARAM_IDS } from '../engine/lvt-module.js'
import { LVT_SCENARIO_BY_CODE } from '../engine/lvt-snapshot.js'
import { InfoPopover, ParamInfo, StatusBadge } from './budget/InfoPopover'
import {
  buildSeries, snapshotAt, decomposeAtYear, hasSupplyEffect, mayHaveSupplySpread, blocksAt, paramIdsFor,
  extremeLevers, fmt, evaluateFiscalTargets, defaultScenarioLabel, scenariosEqual,
  SUPPLY_CASES, DEMAND_REGIME_OPTIONS, PHASING_OPTIONS, FLAGGED_STATUSES,
} from './budget/helpers'
import { NEUTRAL_SCENARIOS, MACRO_VARIANT_BY_ID, overridesForMacro, matchesScenario } from './budget/presets'
import './SimulateurBudgetPage.css'

const P = resolveParams()
const EPS = P['fisc.eps']
const EPS_OFFRE = P['fisc.eps_offre']
const DEFAULT_YEAR_IDX = 5
const BRIEF_DATE_ISO = new Date().toISOString().slice(0, 10)

function StressBanner({ stressTest, result, reference, unshockedResult, centralReference, onClear }) {
  if (!stressTest || !result || !reference || !unshockedResult || !centralReference) return null
  const N = result.years.length - 1
  const endYear = result.years[N]
  const r = result.total[N]
  const refS = reference.total[N]
  const u = unshockedResult.total[N]
  const c = centralReference.total[N]
  const hasLevers = result.total.some((row) => Object.keys(row.byInstrument ?? {}).length > 0)
  const costDebtPp = (r.debtRatio - u.debtRatio) * 100
  const refRisePp = (refS.debtRatio - c.debtRatio) * 100
  const protectPp = (r.debtRatio - refS.debtRatio) * 100
  const intDeltaMd = refS.interest - c.interest

  return (
    <div className="sb-stress-banner sb-screen-only" role="status">
      <div className="sb-macro-banner-text">
        <strong>Choc macroéconomique actif : {stressTest.titre}</strong>
        {hasLevers ? (
          <p>
            En {endYear}, ce choc porte la dette de votre plan de <strong>{fmt(u.debtRatio * 100, 1)} %</strong> à{' '}
            <strong>{fmt(r.debtRatio * 100, 1)} %</strong> ({fmt(costDebtPp, 1, { signed: true })} pt de dette ; solde{' '}
            <strong>{fmt(r.balanceRatio * 100, 2)} %</strong> contre <strong>{fmt(u.balanceRatio * 100, 2)} %</strong> hors choc).{' '}
            Sans mesure nouvelle sous ce même choc, la référence passe de <strong>{fmt(c.debtRatio * 100, 1)} %</strong> à{' '}
            <strong>{fmt(refS.debtRatio * 100, 1)} %</strong> ({fmt(refRisePp, 1, { signed: true })} pt) : votre plan contient la trajectoire de{' '}
            <strong>{fmt(protectPp, 1, { signed: true })} pt</strong>.
          </p>
        ) : (
          <p>
            Choc actif sans mesure budgétaire : en {endYear}, ce choc porte la dette de politique inchangée de{' '}
            <strong>{fmt(c.debtRatio * 100, 1)} %</strong> à <strong>{fmt(refS.debtRatio * 100, 1)} %</strong> ({fmt(refRisePp, 1, { signed: true })} pt) et modifie la charge d&apos;intérêts de{' '}
            <strong>{fmt(intDeltaMd, 1, { signed: true })} Md€/an</strong>. Activez un scénario type ou des leviers pour tester la résistance d&apos;un plan.
          </p>
        )}
      </div>
      <button type="button" className="sb-btn" onClick={onClear}>Désactiver le choc</button>
    </div>
  )
}

export default function SimulateurBudgetPage() {
  // Scénario lu une seule fois dans l'adresse (#/budget?h=…&cas=…&m=…&choc=…&levier=…), validé par decodeScenario.
  const [initial] = useState(() => decodeScenario(queryFromHash(window.location.hash)))
  const [values, setValues] = useState(initial.values)
  const [horizon, setHorizon] = useState(initial.horizon)
  const [ysCase, setYsCase] = useState(initial.ysCase)
  const [phasingYears, setPhasingYears] = useState(initial.phasingYears ?? DEFAULT_PHASING)
  const [macroId, setMacroId] = useState(initial.stressId ? null : initial.macroId)
  const [stressId, setStressId] = useState(initial.stressId ?? null)
  const [lvt, setLvt] = useState(initial.lvt ?? DEFAULT_LVT)
  const [demandRegime, setDemandRegime] = useState(initial.demandRegime ?? DEFAULT_REGIME)
  const [endogenousInflation, setEndogenousInflation] = useState(Boolean(initial.endogenousInflation))
  const [showBand, setShowBand] = useState(true)
  const [pinnedScenario, setPinnedScenario] = useState(() => initial.pinned ?? null)
  const [decompBase, setDecompBase] = useState('ref')
  const [compareLiveMsg, setCompareLiveMsg] = useState('')
  const [yearIdxRaw, setYearIdx] = useState(DEFAULT_YEAR_IDX)

  const horizonYears = HORIZONS[horizon].endYear - START_YEAR
  const stressConfig = useMemo(() => resolveStressConfig(stressId, horizonYears, P), [stressId, horizonYears])
  const activeStress = stressConfig?.stress ?? null
  const effectiveRegime = stressConfig?.demandRegime ?? demandRegime
  const macroVariant = !activeStress && macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId) ? MACRO_VARIANT_BY_ID[macroId] : null
  const macroOverrides = useMemo(() => (activeStress ? undefined : overridesForMacro(macroId)), [activeStress, macroId])
  const overrides = useMemo(() => (stressConfig ? stressConfig.overrides : macroOverrides), [stressConfig, macroOverrides])
  const activeP = useMemo(() => resolveParams(overrides), [overrides])
  // Module « taxe sur la valeur du sol » : inactif par défaut (scénario 0) ; la borne OCDE n'a de sens qu'en S2 et S3.
  const lvtScenario = LVT_SCENARIO_BY_CODE[lvt.scenario] ?? null
  const lvtSetting = useMemo(() => (lvtScenario ? { scenario: lvtScenario.code, ocde: lvtScenario.code >= 2 && lvt.ocde === 1 ? 1 : 0 } : null), [lvtScenario, lvt.ocde])
  const modules = useMemo(() => (lvtSetting ? [{ module: LVT_MODULE, levers: { scenario: lvtSetting.scenario, offre_ocde: lvtSetting.ocde } }] : []), [lvtSetting])

  // Curseurs fluides à 60 fps : les valeurs de calcul des graphiques/tableaux sont différées pendant le glissement.
  const deferredValues = useDeferredValue(values)

  // Référence (Mode 1 : soumise au même choc si stress-test actif, sinon prévisionnistes indépendants) et scénario actif.
  const reference = useMemo(
    () => projectScenario({
      levers: {},
      overrides: stressConfig ? stressConfig.overrides : undefined,
      horizon,
      ysCase,
      demandRegime: effectiveRegime,
      endogenousInflation,
      yDExog: stressConfig?.yDExog,
    }),
    [stressConfig, horizon, ysCase, effectiveRegime, endogenousInflation],
  )
  const result = useMemo(
    () => projectScenario({
      levers: deferredValues,
      overrides,
      horizon,
      ysCase,
      phasingYears,
      modules,
      demandRegime: effectiveRegime,
      endogenousInflation,
      yDExog: stressConfig?.yDExog,
    }),
    [deferredValues, overrides, horizon, ysCase, phasingYears, modules, effectiveRegime, endogenousInflation, stressConfig],
  )
  const centralReference = useMemo(
    () => (stressConfig ? projectScenario({ levers: {}, horizon, ysCase, demandRegime, endogenousInflation }) : null),
    [stressConfig, horizon, ysCase, demandRegime, endogenousInflation],
  )
  const unshockedResult = useMemo(
    () => (stressConfig
      ? projectScenario({ levers: deferredValues, horizon, ysCase, phasingYears, modules, demandRegime, endogenousInflation })
      : null),
    [stressConfig, deferredValues, horizon, ysCase, phasingYears, modules, demandRegime, endogenousInflation],
  )

  // Éventail paramétrique des effets d'offre (bas / central / haut) : réutilise `result` pour le cas actif (au plus 2 appels différés).
  const potentialSpread = useMemo(() => mayHaveSupplySpread(deferredValues, lvtSetting), [deferredValues, lvtSetting])
  const supplyEnvelope = useMemo(() => {
    if (!potentialSpread) return null
    const runCase = (c) => (c === ysCase
      ? result
      : projectScenario({
          levers: deferredValues, overrides, horizon, ysCase: c, phasingYears, modules,
          demandRegime: effectiveRegime, endogenousInflation, yDExog: stressConfig?.yDExog,
        }))
    const bas = runCase('bas')
    const central = runCase('central')
    const haut = runCase('haut')
    const spreadExists = bas.total.some((r, t) => Math.abs(haut.total[t].gdpEffect - r.gdpEffect) > 1e-6)
    return spreadExists ? { bas, central, haut } : null
  }, [potentialSpread, ysCase, result, deferredValues, overrides, horizon, phasingYears, modules, effectiveRegime, endogenousInflation, stressConfig])

  // Scénario épinglé A (calculé à l'horizon courant ; invariant pendant le glissement des curseurs de B).
  const resultA = useMemo(() => {
    if (!pinnedScenario) return null
    const stressCfgA = pinnedScenario.stressId ? resolveStressConfig(pinnedScenario.stressId, horizonYears, P) : null
    const ovA = stressCfgA ? stressCfgA.overrides : overridesForMacro(pinnedScenario.macroId)
    const regA = stressCfgA?.demandRegime ?? pinnedScenario.demandRegime ?? DEFAULT_REGIME
    const lvtScA = LVT_SCENARIO_BY_CODE[pinnedScenario.lvt?.scenario] ?? null
    const modA = lvtScA
      ? [{ module: LVT_MODULE, levers: { scenario: lvtScA.code, offre_ocde: lvtScA.code >= 2 && pinnedScenario.lvt.ocde === 1 ? 1 : 0 } }]
      : []
    return projectScenario({
      levers: pinnedScenario.values ?? {},
      overrides: ovA,
      horizon,
      ysCase: pinnedScenario.ysCase ?? 'central',
      phasingYears: pinnedScenario.phasingYears ?? DEFAULT_PHASING,
      modules: modA,
      demandRegime: regA,
      endogenousInflation: Boolean(pinnedScenario.endogenousInflation),
      yDExog: stressCfgA?.yDExog,
    })
  }, [pinnedScenario, horizon, horizonYears])

  const N = result.years.length - 1
  const yearIdx = Math.min(Math.max(yearIdxRaw, 1), N)

  const warnings = useMemo(() => evaluateWarnings(result), [result])
  const warningsA = useMemo(() => (resultA ? evaluateWarnings(resultA) : null), [resultA])
  const warningsBas = useMemo(() => (supplyEnvelope ? evaluateWarnings(supplyEnvelope.bas) : null), [supplyEnvelope])
  const activeShowBand = Boolean(showBand && supplyEnvelope)

  const targets = useMemo(() => evaluateFiscalTargets(result, activeP), [result, activeP])
  const series = useMemo(
    () => buildSeries(result, reference, { envelope: activeShowBand ? supplyEnvelope : null, resultA, centralReference }),
    [result, reference, activeShowBand, supplyEnvelope, resultA, centralReference],
  )
  const snaps = useMemo(() => [
    { titre: 'Année 1', snap: snapshotAt(result, reference, 1, resultA) },
    { titre: 'Année 5', snap: snapshotAt(result, reference, Math.min(5, N), resultA) },
    { titre: 'Fin d\'horizon', snap: snapshotAt(result, reference, N, resultA) },
  ], [result, reference, N, resultA])

  const effectiveDecompBase = resultA && decompBase === 'pinned' ? 'pinned' : 'ref'
  const decompBaseline = effectiveDecompBase === 'pinned' ? resultA : reference
  const decomposition = useMemo(() => decomposeAtYear(result, decompBaseline, yearIdx, EPS, EPS_OFFRE), [result, decompBaseline, yearIdx])
  const incidence = useMemo(
    () => computeIncidenceAtYear(result, yearIdx, activeP, { lvtScenario, lvtCompanyShiftMd: lvtScenario?.companyLandMd ?? 0 }),
    [result, yearIdx, activeP, lvtScenario],
  )
  const blocks = useMemo(() => blocksAt(result, reference, yearIdx, resultA), [result, reference, yearIdx, resultA])
  const paramIds = useMemo(() => {
    const idsB = paramIdsFor(deferredValues, result, macroVariant ? macroId : null, stressId)
    const idsA = pinnedScenario && resultA ? paramIdsFor(pinnedScenario.values, resultA, pinnedScenario.macroId, pinnedScenario.stressId) : []
    const lvtB = lvtSetting ? LVT_PARAM_IDS : []
    const lvtA = pinnedScenario?.lvt?.scenario > 0 ? LVT_PARAM_IDS : []
    return [...new Set([...idsB, ...idsA, ...lvtB, ...lvtA])].filter((id) => PARAM_BY_ID[id])
  }, [deferredValues, result, macroVariant, macroId, stressId, lvtSetting, pinnedScenario, resultA])

  // Aucune ligne d'offre non nulle dans le résultat du moteur : le choix bas / central / haut ne change rien.
  const noSupplyEffect = !hasSupplyEffect(result)

  const isIdenticalToA = useMemo(() => {
    if (!pinnedScenario) return false
    return scenariosEqual(
      { values: deferredValues, ysCase, macroId: activeStress ? null : macroId, stressId, lvt: lvtSetting, demandRegime: effectiveRegime, endogenousInflation, phasingYears },
      pinnedScenario,
    )
  }, [pinnedScenario, deferredValues, ysCase, activeStress, macroId, stressId, lvtSetting, effectiveRegime, endogenousInflation, phasingYears])

  // Adresse du scénario mise à jour sans entrée d'historique, avec un délai pour ne pas écrire à chaque cran de curseur.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(
        window.history.state,
        '',
        scenarioHash({ values, horizon, ysCase, phasingYears, macroId, stressId, lvt: lvtSetting, demandRegime, endogenousInflation, pinned: pinnedScenario }),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [values, horizon, ysCase, phasingYears, macroId, stressId, lvtSetting, demandRegime, endogenousInflation, pinnedScenario])

  const dynamicsLabel = useMemo(() => {
    const parts = []
    if (effectiveRegime !== DEFAULT_REGIME) {
      parts.push(`Régime E4 : ${DEMAND_REGIME_OPTIONS.find((o) => o.id === effectiveRegime)?.label ?? effectiveRegime}${stressConfig?.demandRegime ? ' (imposé par le choc)' : ''}`)
    }
    if (endogenousInflation) parts.push('Inflation endogène et répercussion TVA actives')
    return parts.length ? parts.join(' · ') : null
  }, [effectiveRegime, endogenousInflation, stressConfig])

  const shareScenarioState = useMemo(() => ({
    values, horizon, ysCase, phasingYears, macroId, stressId, lvt: lvtSetting, demandRegime, endogenousInflation, pinned: pinnedScenario,
  }), [values, horizon, ysCase, phasingYears, macroId, stressId, lvtSetting, demandRegime, endogenousInflation, pinnedScenario])

  const briefData = useMemo(() => buildBriefData({
    result,
    reference,
    unshockedResult,
    centralReference,
    resultA,
    pinnedScenario,
    values: deferredValues,
    horizon,
    ysCase,
    phasingYears,
    macroVariant,
    stressTest: activeStress,
    lvtSetting,
    lvtScenario,
    demandRegime: effectiveRegime,
    endogenousInflation,
    targets,
    incidence,
    warnings,
    paramIds,
    overrides,
    P: activeP,
    eps: EPS,
    epsOffre: EPS_OFFRE,
    url: typeof window !== 'undefined' ? scenarioUrl(window.location, shareScenarioState) : '',
    stamp: versionStamp(),
    dateIso: BRIEF_DATE_ISO,
  }), [
    result, reference, unshockedResult, centralReference, resultA, pinnedScenario, deferredValues,
    horizon, ysCase, phasingYears, macroVariant, activeStress, lvtSetting, lvtScenario,
    effectiveRegime, endogenousInflation, targets, incidence, warnings, paramIds, overrides, activeP, shareScenarioState,
  ])

  const exportCsv = () => {
    const csv = buildCsv({
      stamp: versionStamp(), url: scenarioUrl(window.location, shareScenarioState),
      horizonLabel: HORIZONS[horizon].label, ysCase, phasingYears,
      macroLabel: macroVariant?.label ?? null,
      stressLabel: activeStress?.titre ?? null,
      dynamicsLabel,
      pinnedMeta: pinnedScenario ? { label: pinnedScenario.label } : null,
      values, rows: buildExportRows(result, reference, EPS, EPS_OFFRE),
      modules: lvtScenario ? [[`Module ${LVT_MODULE.titre}`, `${lvtScenario.libelle}${lvtSetting.ocde ? ' ; borne haute OCDE incluse dans le cas « haut »' : ''}`]] : [],
    })
    downloadCsv(csv, `simulateur-budget-${horizon}-${ysCase}${phasingYears > 1 ? `-rampe${phasingYears}a` : ''}${macroVariant ? `-${macroId}` : ''}${activeStress ? `-${activeStress.id}` : ''}${lvtScenario ? `-lvt-${lvtScenario.id}` : ''}.csv`)
  }

  const exportCsvVsA = () => {
    if (!resultA || !pinnedScenario) return
    const csv = buildCsv({
      stamp: versionStamp(), url: scenarioUrl(window.location, shareScenarioState),
      horizonLabel: HORIZONS[horizon].label, ysCase, phasingYears,
      macroLabel: macroVariant?.label ?? null,
      stressLabel: activeStress?.titre ?? null,
      dynamicsLabel,
      pinnedMeta: { label: pinnedScenario.label },
      values, rows: buildExportRows(result, resultA, EPS, EPS_OFFRE), columns: COLUMNS_VS_A,
      modules: lvtScenario ? [[`Module ${LVT_MODULE.titre}`, `${lvtScenario.libelle}${lvtSetting.ocde ? ' ; borne haute OCDE incluse dans le cas « haut »' : ''}`]] : [],
    })
    downloadCsv(csv, `simulateur-budget-comparaison-${horizon}.csv`)
  }

  const exportBriefMd = () => {
    const md = formatBriefMarkdown(briefData)
    downloadMarkdown(md, `note-synthese-budget-${horizon}${activeStress ? `-${activeStress.id}` : ''}.md`)
  }

  const setLever = useCallback((id, x) => setValues((v) => ({ ...v, [id]: x })), [])
  const handleReset = useCallback(() => { setValues({}); setLvt(DEFAULT_LVT) }, [])
  const handleExtreme = useCallback((w) => setValues(extremeLevers(w)), [])
  const toggleStress = useCallback((id) => {
    setStressId((prev) => {
      const next = prev === id ? null : id
      if (next) setMacroId(null)
      return next
    })
  }, [])
  const applyScenario = (scenario) => {
    if (scenario.id === 'reference') {
      setValues({})
      setMacroId(null)
      setStressId(null)
      setLvt(DEFAULT_LVT)
      return
    }
    setValues({ ...scenario.levers })
    setMacroId(scenario.macroId ?? null)
    if (scenario.macroId) setStressId(null)
    setLvt(DEFAULT_LVT)
  }

  const captureCurrentAsPin = useCallback((labelOverride = null) => ({
    label: labelOverride || defaultScenarioLabel({ values, macroId: activeStress ? null : macroId, stressId, lvt: lvtSetting, phasingYears }),
    values: { ...values },
    ysCase,
    macroId: activeStress ? null : macroId,
    stressId,
    lvt: lvtSetting ? { ...lvtSetting } : DEFAULT_LVT,
    demandRegime: effectiveRegime,
    endogenousInflation,
    phasingYears,
  }), [values, activeStress, macroId, stressId, lvtSetting, phasingYears, ysCase, effectiveRegime, endogenousInflation])

  const handlePinCurrent = () => {
    const nextPin = captureCurrentAsPin()
    setPinnedScenario(nextPin)
    setCompareLiveMsg(`Scénario « ${nextPin.label} » épinglé en A.`)
  }

  const handleSwapPin = () => {
    if (!pinnedScenario) return
    const prevB = captureCurrentAsPin('Ancien scénario B')
    setValues({ ...(pinnedScenario.values ?? {}) })
    setYsCase(pinnedScenario.ysCase ?? 'central')
    setStressId(pinnedScenario.stressId ?? null)
    setMacroId(pinnedScenario.stressId ? null : (pinnedScenario.macroId ?? null))
    setLvt(pinnedScenario.lvt ? { ...pinnedScenario.lvt } : DEFAULT_LVT)
    setDemandRegime(pinnedScenario.demandRegime ?? DEFAULT_REGIME)
    setEndogenousInflation(Boolean(pinnedScenario.endogenousInflation))
    setPhasingYears(pinnedScenario.phasingYears ?? DEFAULT_PHASING)
    setPinnedScenario(prevB)
    setCompareLiveMsg('Scénarios A et B échangés.')
  }

  const handleReplacePin = () => {
    const nextPin = captureCurrentAsPin(pinnedScenario?.label)
    setPinnedScenario(nextPin)
    setCompareLiveMsg('Scénario A remplacé par les réglages courants.')
  }

  const handleClearPin = () => {
    setPinnedScenario(null)
    setDecompBase('ref')
    setCompareLiveMsg('Comparaison avec le scénario A effacée.')
  }

  return (
    <div className="sb-page">
      <header className="sb-screen-only">
        <h1 className="sb-title">Simulateur budgétaire</h1>
        <p className="sb-help">Administrations publiques consolidées (État et ODAC, sécurité sociale, collectivités), effets d&apos;offre explicites et référence sans mesure nouvelle. Les paramètres portant un statut à vérifier ({FLAGGED_STATUSES.map((s) => `« ${s} »`).join(', ')}) sont signalés par une pastille dédiée.</p>
      </header>

      <section className="sb-section sb-screen-only" aria-labelledby="sb-options">
        <h2 id="sb-options">Horizon et effets d'offre</h2>
        <div className="sb-options">
          <div>
            <label htmlFor="sb-horizon">Horizon</label>
            <select id="sb-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {Object.values(HORIZONS).map((h) => <option key={h.id} value={h.id}>{h.label} (jusqu'en {h.endYear})</option>)}
            </select>
          </div>
            <div>
              <label htmlFor="sb-case">Cas des effets d&apos;offre</label>
              <select id="sb-case" aria-describedby={noSupplyEffect ? 'sb-case-hint' : undefined} value={ysCase} onChange={(e) => setYsCase(e.target.value)}>
                {SUPPLY_CASES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              {noSupplyEffect && !supplyEnvelope && <p className="sb-hint" id="sb-case-hint">Sans effet pour les leviers choisis</p>}
              {noSupplyEffect && supplyEnvelope && <p className="sb-hint" id="sb-case-hint">Nul au cas central, mais non nul en bas/haut (voir faisceau)</p>}
            </div>
            <div>
              <label htmlFor="sb-phasing">Montée en charge des mesures</label>
              <select id="sb-phasing" value={phasingYears} onChange={(e) => setPhasingYears(Number(e.target.value))}>
                {PHASING_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="sb-module-check">
            <input id="sb-band" type="checkbox" checked={showBand} disabled={!supplyEnvelope} onChange={(e) => setShowBand(e.target.checked)} />
            <label htmlFor="sb-band">
              Afficher la fourchette paramétrique des effets d&apos;offre (bas–haut) sur les graphiques
              {!supplyEnvelope && ' — aucun écart d\'offre actif'}
            </label>
          </div>
          <p className="sb-help">Bas et haut désignent les résultats les moins et les plus favorables pour le PIB, et non l&apos;ordre statistique des valeurs (σ). Au-delà de dix ans, lisez les trois cas ensemble : le modèle reste déterministe. L&apos;étalement sur 3 ou 5 ans lisse le choc de demande initial (E4) et la trajectoire de dépense nette sans modifier les calendriers légaux par génération (âge légal).</p>
        <details className="sb-module-details" open={effectiveRegime !== DEFAULT_REGIME || endogenousInflation}>
          <summary>
            Dynamiques avancées (optionnelles){dynamicsLabel ? ` — actives : ${dynamicsLabel}` : ' — désactivées par défaut'}
          </summary>
          <div className="sb-options">
            <div>
              <label htmlFor="sb-regime">Régime des multiplicateurs (E4)</label>
              <select id="sb-regime" value={effectiveRegime} disabled={Boolean(stressConfig?.demandRegime)} onChange={(e) => setDemandRegime(e.target.value)}>
                {DEMAND_REGIME_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              {stressConfig?.demandRegime && <p className="sb-hint">Imposé par le stress-test Récession 2027.</p>}
            </div>
            <div className="sb-module-check">
              <input id="sb-infl" type="checkbox" checked={endogenousInflation} onChange={(e) => setEndogenousInflation(e.target.checked)} />
              <label htmlFor="sb-infl">Inflation endogène et répercussion TVA (courbe de Phillips, indexation pensions t−1, OATi)</label>
            </div>
          </div>
          <p className="sb-help">Désactivées par défaut (hypothèses standards). En régime de récession ou ELB, les multiplicateurs de dépense sont relevés (Gechert &amp; Rannenberg 2018 ; BdF WP 883) ; l&apos;inflation endogène ajoute la répercussion TVA (~80 %), une courbe de Phillips bornée à ±3 pts, l&apos;indexation OATi et le décalage d&apos;un an des pensions (CSS L. 161-25).</p>
        </details>
      </section>

      <section className="sb-section sb-screen-only" aria-labelledby="sb-partage">
        <h2 id="sb-partage">Partager et exporter</h2>
        <p className="sb-help">Le lien reprend les leviers, l&apos;horizon, le cas des effets d&apos;offre, l&apos;éventuel comparateur ou stress-test, les dynamiques avancées et le module « taxe sur la valeur du sol » s&apos;il est actif ; il rouvre exactement ce scénario. Vous pouvez exporter les séries en CSV, ou produire une note de synthèse d&apos;une page en Markdown ou en PDF.</p>
        <div className="sb-toolbar">
          <ShareButton getUrl={() => scenarioUrl(window.location, shareScenarioState)} />
          <button type="button" className="sb-btn" onClick={exportCsv}>Exporter (CSV)</button>
          {resultA && <button type="button" className="sb-btn" onClick={exportCsvVsA}>Exporter B vs A (CSV)</button>}
          <button type="button" className="sb-btn" onClick={exportBriefMd}>Télécharger la note (.md)</button>
          <CopyBriefButton getMarkdown={() => formatBriefMarkdown(briefData)} />
          <button type="button" className="sb-btn" onClick={() => window.print()}>Imprimer / PDF</button>
          <button type="button" className="sb-btn" onClick={pinnedScenario ? handleReplacePin : handlePinCurrent}>
            {pinnedScenario ? 'Mettre à jour A avec B' : 'Épingler ce scénario pour comparer (A)'}
          </button>
        </div>
      </section>

      <section className="sb-section sb-screen-only" aria-labelledby="sb-scenarios">
        <h2 id="sb-scenarios">Scénarios types (neutres)</h2>
        <p className="sb-help">Points de départ illustratifs, sans programme partisan. Cliquer un scénario règle les curseurs correspondants (ou active un comparateur macroéconomique) ; vous pouvez ensuite ajuster librement chaque levier.</p>
        <div className="sb-presets" role="group" aria-label="Scénarios types neutres">
          {NEUTRAL_SCENARIOS.map((sc) => {
            const active = !activeStress && matchesScenario(sc, values, macroId, Boolean(lvtSetting))
            return (
              <button key={sc.id} type="button" className={`sb-preset${active ? ' sb-preset-active' : ''}`}
                aria-pressed={active} onClick={() => applyScenario(sc)}>
                <span className="sb-preset-title">{sc.titre}</span>
                <span className="sb-preset-meta">{sc.resume}</span>
                <span className="sb-preset-desc">{sc.description}</span>
              </button>
            )
          })}
        </div>

        <div className="sb-stress-wrap">
          <div className="sb-stress-head">
            <h3 id="sb-stress">Tester la résistance à un choc adverse (optionnel)</h3>
            {activeStress && (
              <button type="button" className="sb-btn" onClick={() => setStressId(null)}>Aucun choc</button>
            )}
          </div>
          <p className="sb-help">Les stress-tests se superposent à vos curseurs sans les effacer : la référence est soumise au même choc pour isoler l&apos;effet propre de vos mesures dans cet environnement dégradé.</p>
          <div className="sb-stress-grid" role="group" aria-labelledby="sb-stress">
            {STRESS_TESTS.map((st) => {
              const active = stressId === st.id
              return (
                <button
                  key={st.id}
                  type="button"
                  className={`sb-preset sb-stress-btn${active ? ' sb-stress-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleStress(st.id)}
                >
                  <span className="sb-preset-title">{st.titre}</span>
                  <span className="sb-preset-meta">{st.badge}</span>
                  <span className="sb-preset-desc">{st.description}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <PolicyBriefPrint data={briefData} />

      <div className="sb-layout">
        <div className="sb-screen-only">
          <LeverPanel values={values} onChange={setLever} onReset={handleReset} onExtreme={handleExtreme} P={P} ysCase={ysCase} phasingYears={phasingYears}>
            <LvtModuleControl lvt={lvt} onChange={setLvt} />
          </LeverPanel>
        </div>
        <div className="sb-results">
          {macroVariant && (
            <div className="sb-macro-banner sb-screen-only" role="status">
              <div className="sb-macro-banner-text">
                <strong>Comparateur macroéconomique actif : {macroVariant.label}</strong>
                <p>{macroVariant.description} Vous pouvez combiner des leviers budgétaires sur cette trajectoire ou revenir à la référence indépendante.</p>
              </div>
              <button type="button" className="sb-btn" onClick={() => setMacroId(null)}>Revenir à la référence indépendante</button>
            </div>
          )}
          <StressBanner
            stressTest={activeStress}
            result={result}
            reference={reference}
            unshockedResult={unshockedResult}
            centralReference={centralReference}
            onClear={() => setStressId(null)}
          />
          <div className="sb-screen-only">
            <ComparisonBanner
              pinned={pinnedScenario}
              isIdentical={isIdenticalToA}
              onLabelChange={(label) => setPinnedScenario((prev) => (prev ? { ...prev, label: label.slice(0, 40) } : null))}
              onSwap={handleSwapPin}
              onReplace={handleReplacePin}
              onClear={handleClearPin}
              liveMessage={compareLiveMsg}
            />
            <WarningBanner warnings={warnings} />
            <Snapshots snaps={snaps} targets={targets} />
          </div>
          <div className="sb-print-charts">
            <Charts
              data={series}
              tier1={warnings.tier1}
              tier2={warnings.tier2}
              hasMacroOverride={Boolean(macroVariant)}
              hasStressTest={Boolean(activeStress)}
              showBand={activeShowBand}
              bandTier2Year={warningsBas?.tier2?.year ?? null}
              pinnedLabel={pinnedScenario?.label ?? null}
              tier2A={warningsA?.tier2 ?? null}
            />
          </div>
          <div className="sb-screen-only">
            <DecompositionTable
              decomposition={decomposition}
              years={result.years}
              yearIdx={yearIdx}
              onYear={setYearIdx}
              hasComparison={Boolean(resultA)}
              decompBase={effectiveDecompBase}
              onDecompBase={setDecompBase}
              pinnedLabel={pinnedScenario?.label ?? null}
            />
            <IncidencePanel incidence={incidence} year={result.years[yearIdx]} />
            <BlocksTable blocks={blocks} year={result.years[yearIdx]} />
            <LvtModuleResults result={result} yearIdx={yearIdx} />
            <section className="sb-section" aria-labelledby="sb-params">
              <h2 id="sb-params">Hypothèses utilisées</h2>
              <p className="sb-help">Paramètres qui pèsent sur le scénario affiché, avec leur source et leur statut.</p>
              <ul className="sb-params">
                {paramIds.map((id) => {
                  const param = PARAM_BY_ID[id]
                  const overridden = overrides && Object.hasOwn(overrides, id) ? overrides[id] : null
                  const ovLabel = activeStress ? 'stress-test' : 'comparateur'
                  const ovVal = overridden !== null
                    ? (typeof overridden === 'object' && overridden[2070] !== undefined
                        ? `2070 : ${fmt(overridden[2070], 1)} ${param.unit}`
                        : `${fmt(overridden, Math.abs(overridden) < 1 ? 3 : 2)} ${param.unit}`)
                    : null
                  return (
                    <li key={id}>
                      <code>{id}</code> <StatusBadge status={param.status} />
                      {overridden !== null && (
                        <> <span className="sb-badge sb-badge-override">{ovLabel} : {ovVal}</span></>
                      )}
                      <InfoPopover label={id}>
                        {overridden !== null && (
                          <span className="sb-info-line"><strong>Valeur {activeStress ? 'du stress-test' : 'du comparateur'} actif :</strong> {ovVal} (remplace la valeur de référence ci-dessous).</span>
                        )}
                        <ParamInfo param={param} />
                      </InfoPopover>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
