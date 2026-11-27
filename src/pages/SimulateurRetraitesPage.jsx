import { useState, useMemo, useId } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import { projectScenario, HORIZONS, START_YEAR } from '../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../engine/params.js'
import { LEVER_BY_ID, staticYield, defaultRampFor } from '../engine/levers.js'
import { NDC_MODULE, NDC_START_T, NDC_RAMP_YEARS } from '../engine/ndc-module.js'
import { WARNING_THRESHOLDS as W } from '../config.js'
import {
  fmt,
  deltaTone,
  niceAxis,
  decomposeAtYear,
  blocksAt,
  hasSupplyEffect,
  evaluateFiscalTargets,
  FISCAL_BENCHMARKS,
  SUPPLY_CASES,
} from './budget/helpers'
import { evaluateWarnings, splitSeriesAtYear, visibleDomain } from './budget/warnings'
import { WarningBanner, DecompositionTable, BlocksTable, TargetsSummary } from './budget/Results'
import { InfoPopover, ParamInfo, StatusBadge } from './budget/InfoPopover'
import JobsNote from './budget/JobsNote'
import {
  LEGAL_AGE_BASE,
  SOURCE_LINKS,
  splitCitations,
  paramStatuses,
  LEVER_STATUS_PARAMS,
  AGEING_REPORT_YEARS,
  healthRiseOverSpan,
  COR_VARIANTS,
  HEALTH_VARIANTS,
  NDC_PRESET,
  UNVALIDATED_PENSION_ITEMS,
  matchesNdcPreset,
  buildPensionOverrides,
  legalAgeFromDelta,
  buildPensionSeries,
  buildPensionSnapshots,
} from './retraites/helpers'
import './SimulateurBudgetPage.css'
import './SimulateurRetraitesPage.css'

const BASE_P = resolveParams()
const EPS = BASE_P['fisc.eps']
const EPS_OFFRE = BASE_P['fisc.eps_offre']
const AGE_LEVER = LEVER_BY_ID['age_legal']
const INDEX_LEVER = LEVER_BY_ID['indexation_pensions']
const TARGETED_INDEX_LEVER = LEVER_BY_ID['sous_indexation_ciblee']
const AGE_SIGMA = PARAM_BY_ID['offre.sigma.age_legal']
const COR_PARAM = PARAM_BY_ID['ref.derive.a_retraites']
const SANTE_PARAM = PARAM_BY_ID['ref.derive.a_sante']
const COR_LAST_YEAR = Math.max(...Object.keys(COR_PARAM.value).map(Number))
const INDEX_START_YEAR = START_YEAR + (INDEX_LEVER.defaultRamp?.start ?? 1)

/** Texte dont les balises [Sxx] connues deviennent des liens vers la source (docs/model-note.md §9). */
function CitedText({ text }) {
  return splitCitations(text).map((part, i) => (part.ref
    ? <a key={i} href={SOURCE_LINKS[part.ref].url} target="_blank" rel="noopener noreferrer" title={SOURCE_LINKS[part.ref].label}>[{part.ref}]</a>
    : <span key={i}>{part.text}</span>))
}

/** Pastilles de statut lues dans PARAM_BY_ID pour un levier retraites. */
function LeverStatus({ leverId }) {
  return paramStatuses(LEVER_STATUS_PARAMS[leverId] ?? []).map((st) => <StatusBadge key={st} status={st} />)
}

function DeltaLine({ value, unit, lowerIsBetter }) {
  const tone = deltaTone(value, lowerIsBetter)
  return <span className={`sb-delta sb-delta-${tone}`}>{fmt(value, 1, { signed: true })} {unit} vs réf.</span>
}

function extentOf(data, key, refKey, domain, isBalance = false) {
  let base = domain
  if (!base) {
    const vals = data.flatMap((r) => [r[key], r[refKey]]).filter(Number.isFinite)
    base = vals.length ? [Math.min(...vals), Math.max(...vals)] : [NaN, NaN]
  }
  if (isBalance && Number.isFinite(base[0]) && Number.isFinite(base[1])) {
    return [base[0], Math.max(base[1], FISCAL_BENCHMARKS.maastrichtDeficitPct + 0.5)]
  }
  return base
}

function DualLineChart({ id, titre, unite, data, dataKey, refKey, dec = 1, tier1 = null, tier2 = null, isDebt = false, isBalance = false }) {
  const tick = { fontSize: 11 }
  const beyond = tier2 ? `${dataKey}Beyond` : null
  const domain = visibleDomain(data, dataKey, refKey, tier2?.year)
  const nice = (domain !== null || isDebt || isBalance) ? niceAxis(...extentOf(data, dataKey, refKey, domain, isBalance), { minStep: isDebt ? 10 : 1 }) : null
  const firstYear = data.length ? data[0].year : null
  const lastYear = data.length ? data[data.length - 1].year : null
  const showTier2Label = tier2 && lastYear > tier2.year && firstYear !== null && (lastYear - tier2.year) / Math.max(1, lastYear - firstYear) >= 0.22
  const maxDebt = isDebt ? Math.max(...data.flatMap((r) => [r[dataKey], r[refKey]]).filter(Number.isFinite), 0) : 0

  return (
    <figure className="sb-chart" aria-label={`${titre} (${unite})`} data-chart-id={id}>
      <figcaption>{titre} <span className="sb-muted">({unite})</span></figcaption>
      <ResponsiveContainer width="100%" height={tier2 ? 260 : 235}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={tick} minTickGap={24} />
          <YAxis
            tick={tick}
            width={44}
            tickFormatter={(v) => fmt(v, dec === 1 ? 0 : 1)}
            domain={nice?.domain ?? domain ?? ['auto', 'auto']}
            ticks={nice?.ticks}
            allowDataOverflow={domain !== null || nice !== null}
          />
          <Tooltip formatter={(v) => `${fmt(v, dec)} ${unite}`} labelFormatter={(y) => `Année ${y}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {tier2 && lastYear > tier2.year && (
            <ReferenceArea
              x1={tier2.year}
              x2={lastYear}
              fill="#9e9e9e"
              fillOpacity={0.12}
              stroke="none"
              ifOverflow="hidden"
              label={showTier2Label ? { value: 'Hors expérience', position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' } : undefined}
            />
          )}
          {isDebt && (tier1 || maxDebt >= 220) && (
            <ReferenceLine
              y={W.tier1DebtPct}
              stroke="#bf4000"
              strokeDasharray="2 4"
              ifOverflow="hidden"
              label={{ value: `${W.tier1DebtPct} %`, position: 'insideBottomLeft', fontSize: 10, fill: '#bf4000' }}
            />
          )}
          {isDebt && tier1 && <ReferenceLine x={tier1.year} stroke="#bf4000" strokeDasharray="2 4" />}
          {isBalance && (
            <ReferenceLine
              y={FISCAL_BENCHMARKS.maastrichtDeficitPct}
              stroke="#2e7d32"
              strokeOpacity={0.75}
              strokeWidth={1.25}
              strokeDasharray="4 3"
              ifOverflow="hidden"
              label={{ value: `Seuil UE ${fmt(FISCAL_BENCHMARKS.maastrichtDeficitPct, 0)} %`, position: 'insideTopLeft', fontSize: 10, fill: '#2e7d32' }}
            />
          )}
          {tier2 && <ReferenceLine x={tier2.year} stroke="#b71c1c" strokeWidth={1.5} />}
          <Line type="monotone" dataKey={dataKey} name="Scénario" stroke="#5c6bc0" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
          {beyond && (
            <Line
              type="monotone"
              dataKey={beyond}
              name="Scénario (hors expérience)"
              stroke="#9e9e9e"
              strokeWidth={2}
              strokeDasharray="1 4"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line type="monotone" dataKey={refKey} name="Référence (sans levier)" stroke="#6b6b6b" strokeWidth={1.75} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

export default function SimulateurRetraitesPage() {
  const [corVariant, setCorVariant] = useState('central')
  const [healthVariant, setHealthVariant] = useState('central')
  const [horizon, setHorizon] = useState('trenteAns')
  const [ysCase, setYsCase] = useState('central')
  const [ageDelta, setAgeDelta] = useState(0)
  const [indexDelta, setIndexDelta] = useState(0)
  const [targetedIndexDelta, setTargetedIndexDelta] = useState(0)
  const [ndcActive, setNdcActive] = useState(false)
  const [yearIdxRaw, setYearIdx] = useState(10)

  const ageId = useId()
  const idxId = useId()
  const targetedIdxId = useId()
  const ndcId = useId()

  const overrides = useMemo(
    () => buildPensionOverrides({ corVariant, healthVariant }),
    [corVariant, healthVariant],
  )
  const activeP = useMemo(() => resolveParams(overrides), [overrides])

  const levers = useMemo(() => {
    const out = {}
    if (ageDelta !== 0) out.age_legal = ageDelta
    if (indexDelta !== 0) out.indexation_pensions = indexDelta
    if (targetedIndexDelta !== 0) out.sous_indexation_ciblee = targetedIndexDelta
    return out
  }, [ageDelta, indexDelta, targetedIndexDelta])

  const modules = useMemo(
    () => (ndcActive ? [{ module: NDC_MODULE, levers: { actif: 1 } }] : []),
    [ndcActive],
  )

  const reference = useMemo(
    () => projectScenario({ levers: {}, horizon, ysCase, overrides }),
    [horizon, ysCase, overrides],
  )
  const result = useMemo(
    () => projectScenario({ levers, modules, horizon, ysCase, overrides }),
    [levers, modules, horizon, ysCase, overrides],
  )

  const N = result.years.length - 1
  const yearIdx = Math.min(Math.max(yearIdxRaw, 1), N)

  const warnings = useMemo(() => evaluateWarnings(result), [result])
  const targets = useMemo(() => evaluateFiscalTargets(result, activeP), [result, activeP])
  const series = useMemo(() => buildPensionSeries(result, reference, activeP), [result, reference, activeP])
  const splitSeries = useMemo(() => splitSeriesAtYear(series, warnings.tier2?.year), [series, warnings.tier2?.year])
  const snapshots = useMemo(() => buildPensionSnapshots(result, reference, activeP), [result, reference, activeP])
  const decomposition = useMemo(() => decomposeAtYear(result, reference, yearIdx, EPS, EPS_OFFRE), [result, reference, yearIdx])
  const blocks = useMemo(() => blocksAt(result, reference, yearIdx), [result, reference, yearIdx])
  const noSupplyEffect = !hasSupplyEffect(result)

  const ageTarget = legalAgeFromDelta(ageDelta)
  const ageRamp = defaultRampFor(AGE_LEVER, ageDelta)
  const ageStartYear = START_YEAR + ageRamp.start
  const ageFullYear = ageStartYear + ageRamp.years - 1
  const ageUpStartYear = START_YEAR + AGE_LEVER.defaultRamp.start
  const ageUpFullYear = ageUpStartYear + AGE_LEVER.defaultRamp.years - 1
  const ageDownStartYear = START_YEAR + AGE_LEVER.defaultRampDown.start
  const ageDownFullYear = ageDownStartYear + AGE_LEVER.defaultRampDown.years - 1
  const ageYield = staticYield(AGE_LEVER, ageDelta, activeP)
  const ageOffsetPct = activeP['comp.offset.age_legal'] * 100
  const idxYield = staticYield(INDEX_LEVER, indexDelta, activeP)
  const targetedIdxYield = staticYield(TARGETED_INDEX_LEVER, targetedIndexDelta, activeP)
  const ndcStartYear = START_YEAR + NDC_START_T
  const ndcFullYear = ndcStartYear + NDC_RAMP_YEARS - 1
  const isNdcPresetActive = matchesNdcPreset({ ageDelta, indexDelta, targetedIndexDelta, ndcActive })

  const applyNdcPreset = () => {
    setAgeDelta(NDC_PRESET.ageDelta)
    setIndexDelta(NDC_PRESET.indexDelta)
    setTargetedIndexDelta(0)
    setNdcActive(NDC_PRESET.ndcActive)
  }

  const resetLevers = () => {
    setAgeDelta(0)
    setIndexDelta(0)
    setTargetedIndexDelta(0)
    setNdcActive(false)
  }

  return (
    <div className="sb-page ret-page">
      <header>
        <h1 className="sb-title">Simulateur Retraites</h1>
        <p className="sb-help">
          Moteur v2 (équations E1–E12) appliqué au système de retraites et au vieillissement : trajectoires du{' '}
          <strong>COR (juin 2026)</strong>, dérive santé / dépendance (Commission européenne 2024), leviers retenus pour
          la version 0.9 (âge légal dès janvier {START_YEAR + AGE_LEVER.defaultRamp.start} avec effet d'offre
          emploi seniors, indexation des pensions) et préréglage{' '}
          <strong>Comptes notionnels</strong> (forme réduite, non validé).
        </p>
      </header>

      {/* VARIANTES DE RÉFÉRENCE & OPTIONS */}
      <section className="sb-section" aria-labelledby="ret-options">
        <h2 id="ret-options">Hypothèses de référence (COR 2026, santé) et horizon</h2>
        <div className="sb-options ret-options-grid">
          <div>
            <label htmlFor="ret-cor">Productivité COR (2070)</label>
            <select id="ret-cor" value={corVariant} onChange={(e) => setCorVariant(e.target.value)}>
              {COR_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ret-health">Dérive santé / dépendance</label>
            <select id="ret-health" value={healthVariant} onChange={(e) => setHealthVariant(e.target.value)}>
              {HEALTH_VARIANTS.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ret-horizon">Horizon</label>
            <select id="ret-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {Object.values(HORIZONS).map((h) => (
                <option key={h.id} value={h.id}>{h.label} (jusqu'en {h.endYear})</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="ret-case">Cas des effets d'offre</label>
            <select
              id="ret-case"
              aria-describedby={noSupplyEffect ? 'ret-case-hint' : undefined}
              value={ysCase}
              onChange={(e) => setYsCase(e.target.value)}
            >
              {SUPPLY_CASES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {noSupplyEffect && <p className="sb-hint" id="ret-case-hint">Sans effet tant que l'âge légal reste à {LEGAL_AGE_BASE} ans</p>}
          </div>
        </div>
        <p className="sb-help">
          La variante COR et la dérive santé s'appliquent à la fois à la référence et au scénario : les écarts affichés
          isolent donc exactement l'effet des leviers retraites sous la démographie retenue.
        </p>
      </section>

      <div className="sb-layout">
        {/* PANNEAU DE LEVIERS */}
        <section className="sb-section" aria-labelledby="ret-leviers">
          <h2 id="ret-leviers">Leviers retraites</h2>
          <div className="sb-toolbar">
            <button type="button" className="sb-btn" onClick={resetLevers}>Remettre à zéro</button>
          </div>

          {/* PRÉRÉGLAGE : COMPTES NOTIONNELS (NDC, DÈS 2028) */}
          <fieldset className="sb-group ret-ndc-group">
            <legend>Préréglage : {NDC_PRESET.titre}</legend>
            <div className="sb-lever-head">
              <StatusBadge status={NDC_PRESET.statut} />
              <span className="ret-confidence-note">Forme réduite — confiance basse</span>
              <InfoPopover label={NDC_PRESET.titre}>
                <span className="sb-info-line"><CitedText text={NDC_PRESET.description} /></span>
                <span className="sb-info-sub">
                  <strong>Sources primaires :</strong>{' '}
                  {NDC_MODULE.sources.join(' ; ')}
                </span>
              </InfoPopover>
            </div>
            <button
              type="button"
              className={`sb-preset ret-preset-btn${isNdcPresetActive ? ' sb-preset-active' : ''}`}
              aria-pressed={isNdcPresetActive}
              onClick={applyNdcPreset}
            >
              <span className="sb-preset-title">Appliquer le préréglage Comptes notionnels</span>
              <span className="sb-preset-meta">{NDC_PRESET.resume}</span>
            </button>
            <label className="ret-ndc-toggle" htmlFor={ndcId}>
              <input
                id={ndcId}
                type="checkbox"
                checked={ndcActive}
                onChange={(e) => setNdcActive(e.target.checked)}
              />
              <span>Activer le module « Comptes notionnels » (dès janv. {ndcStartYear}, plein effet {ndcFullYear})</span>
            </label>
            <p className="ret-lever-note">
              Stabilise la dérive démographique COR post-2025 sur {NDC_RAMP_YEARS} cohortes (<code>yS</code> propre = 0 ;
              l'effet emploi seniors vient uniquement du levier âge légal).{' '}
              <CitedText text={NDC_PRESET.hypothese} /> Le modèle publié par le Parti libéral français{' '}
              <CitedText text="[S24]" /> est mentionné en comparaison externe : son −53 % en 2070 (marge, non économie) et
              ses mesures de programme sont exclus.
            </p>
          </fieldset>

          <fieldset className="sb-group">
            <legend>Leviers retenus pour la version 0.9 (actifs)</legend>
            <p className="sb-help">
              Effet sur le bloc sécurité sociale (ASSO) et, pour l'âge légal, effet d'offre sur le PIB via l'emploi des
              seniors (<code>ε_offre = {fmt(EPS_OFFRE * 100, 1)} %</code>).
            </p>

            {/* ÂGE LÉGAL */}
            <div className="sb-lever">
              <div className="sb-lever-head">
                <label htmlFor={ageId}>{AGE_LEVER.titre}</label>
                <LeverStatus leverId="age_legal" />
                <InfoPopover label={AGE_LEVER.titre}>
                  <span className="sb-info-line">{AGE_LEVER.aide}</span>
                  <span className="sb-info-sub">
                    <strong>rend.age_legal.hausse</strong>
                    <ParamInfo param={PARAM_BY_ID['rend.age_legal.hausse']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>rend.age_legal.baisse</strong>
                    <ParamInfo param={PARAM_BY_ID['rend.age_legal.baisse']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>comp.offset.age_legal</strong>
                    <ParamInfo param={PARAM_BY_ID['comp.offset.age_legal']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>offre.sigma.age_legal</strong>
                    <ParamInfo param={PARAM_BY_ID['offre.sigma.age_legal']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>offre.emplois_par_pt_pib.age_legal</strong>
                    <ParamInfo param={PARAM_BY_ID['offre.emplois_par_pt_pib.age_legal']} />
                  </span>
                </InfoPopover>
              </div>
              <input
                id={ageId}
                type="range"
                className="sb-slider"
                min={AGE_LEVER.min}
                max={AGE_LEVER.max}
                step={0.5}
                value={ageDelta}
                aria-valuetext={`${fmt(ageTarget, 1)} ans (${fmt(ageDelta, 1, { signed: true })} ${Math.abs(ageDelta) > 1 ? 'ans' : 'an'} par rapport à ${LEGAL_AGE_BASE} ans)`}
                onChange={(e) => setAgeDelta(parseFloat(e.target.value))}
              />
              <div className="sb-lever-foot">
                <span className="sb-lever-value">
                  <strong>{fmt(ageTarget, 1)} ans</strong> ({fmt(ageDelta, 1, { signed: true })} {Math.abs(ageDelta) > 1 ? 'ans' : 'an'} vs {LEGAL_AGE_BASE} ans)
                </span>
                <span className="sb-lever-yield">
                  Étalon : <strong>{fmt(ageYield, 1, { signed: true })} Md€</strong>/an (dès {ageStartYear}, plein effet {ageFullYear})
                </span>
              </div>
              <p className="ret-lever-note">
                Pensions brutes (hors cotisations retraites déjà dans <code>ε_offre</code>) :{' '}
                <strong>{fmt(staticYield(AGE_LEVER, 1, activeP), 2, { signed: true })} Md€</strong>/an en hausse (dès {ageUpStartYear}, plein effet {ageUpFullYear}) /{' '}
                <strong>{fmt(staticYield(AGE_LEVER, -1, activeP), 2, { signed: true })} Md€</strong>/an en baisse (dès {ageDownStartYear}, plein effet {ageDownFullYear}),
                corrigées de <strong>{fmt(ageOffsetPct, 0)} %</strong> d'effets de report sociaux (DREES/DARES <CitedText text="[S27]" />).
                Offre emploi seniors : <strong>{fmt(AGE_SIGMA.value, 2, { signed: true })} %</strong> PIB/an (
                {fmt(AGE_SIGMA.low, 2, { signed: true })} / {fmt(AGE_SIGMA.high, 2, { signed: true })} %).
              </p>
              <JobsNote leverId="age_legal" x={ageDelta} P={activeP} ysCase={ysCase} className="ret-lever-note" />
            </div>

            {/* INDEXATION DES PENSIONS */}
            <div className="sb-lever">
              <div className="sb-lever-head">
                <label htmlFor={idxId}>{INDEX_LEVER.titre}</label>
                <LeverStatus leverId="indexation_pensions" />
                <InfoPopover label={INDEX_LEVER.titre}>
                  <span className="sb-info-line">{INDEX_LEVER.aide}</span>
                  <span className="sb-info-sub">
                    <strong>comp.offset.prestations</strong>
                    <ParamInfo param={PARAM_BY_ID['comp.offset.prestations']} />
                  </span>
                </InfoPopover>
              </div>
              <input
                id={idxId}
                type="range"
                className="sb-slider"
                min={INDEX_LEVER.min}
                max={INDEX_LEVER.max}
                step={0.5}
                value={indexDelta}
                aria-valuetext={`${fmt(indexDelta, 1, { signed: true })} ${Math.abs(indexDelta) > 1 ? 'points' : 'point'} par rapport à l'inflation`}
                onChange={(e) => setIndexDelta(parseFloat(e.target.value))}
              />
              <div className="sb-lever-foot">
                <span className="sb-lever-value">
                  <strong>{fmt(indexDelta, 1, { signed: true })} pt</strong> vs inflation
                </span>
                <span className="sb-lever-yield">
                  Étalon : <strong>{fmt(idxYield, 1, { signed: true })} Md€</strong>/an (dès {INDEX_START_YEAR})
                </span>
              </div>
              <p className="ret-lever-note">
                −1 = 1 point sous l'inflation ({fmt(staticYield(INDEX_LEVER, -1, activeP), 1, { signed: true })} Md€/an),
                effet de niveau permanent. Décalage <code>comp.offset.prestations</code> à {fmt(activeP['comp.offset.prestations'] * 100, 0)} % par défaut.
              </p>
            </div>

            {/* SOUS-INDEXATION CIBLÉE (> 2 000 €/MOIS, DÉCISION D-P6) */}
            <div className="sb-lever">
              <div className="sb-lever-head">
                <label htmlFor={targetedIdxId}>{TARGETED_INDEX_LEVER.titre}</label>
                <LeverStatus leverId="sous_indexation_ciblee" />
                <InfoPopover label={TARGETED_INDEX_LEVER.titre}>
                  <span className="sb-info-line">{TARGETED_INDEX_LEVER.aide}</span>
                  <span className="sb-info-sub">
                    <strong>rend.sous_indexation_ciblee</strong>
                    <ParamInfo param={PARAM_BY_ID['rend.sous_indexation_ciblee']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>comp.offset.pensions_hautes</strong>
                    <ParamInfo param={PARAM_BY_ID['comp.offset.pensions_hautes']} />
                  </span>
                </InfoPopover>
              </div>
              <input
                id={targetedIdxId}
                type="range"
                className="sb-slider"
                min={TARGETED_INDEX_LEVER.min}
                max={TARGETED_INDEX_LEVER.max}
                step={0.5}
                value={targetedIndexDelta}
                aria-valuetext={`${fmt(targetedIndexDelta, 1, { signed: true })} point sous l'inflation (pensions > 2 000 €/mois)`}
                onChange={(e) => setTargetedIndexDelta(parseFloat(e.target.value))}
              />
              <div className="sb-lever-foot">
                <span className="sb-lever-value">
                  <strong>{fmt(targetedIndexDelta, 1, { signed: true })} pt</strong> sous l'inflation
                </span>
                <span className="sb-lever-yield">
                  Étalon : <strong>{fmt(targetedIdxYield, 1, { signed: true })} Md€</strong>/an (dès {INDEX_START_YEAR})
                </span>
              </div>
              <p className="ret-lever-note">
                Alternative légalement standard au plafonnement (D-P6) : −1 pt ={' '}
                {fmt(staticYield(TARGETED_INDEX_LEVER, -1, activeP), 2, { signed: true })} Md€ bruts/an, corrigé de{' '}
                <strong>{fmt(activeP['comp.offset.pensions_hautes'] * 100, 0)} %</strong> de retour fiscal hautes pensions (IR + CSG).
              </p>
            </div>
          </fieldset>

          {/* MESURES NON VALIDÉES (DÉSACTIVÉES) */}
          <fieldset className="sb-group sb-group-disabled">
            <legend>Mesures non validées (désactivées)</legend>
            <p className="sb-help">
              Affichées par transparence pour les relecteurs ; aucun effet budgétaire tant que le calibrage n'est pas validé.
            </p>
            {UNVALIDATED_PENSION_ITEMS.map((item) => (
              <div key={item.id} className="sb-lever sb-lever-disabled">
                <div className="sb-lever-head">
                  <span>{item.titre}</span>
                  <span className="sb-badge sb-badge-flag">{item.badge}</span>
                </div>
                <p className="ret-lever-note">{item.detail}</p>
              </div>
            ))}
          </fieldset>
        </section>

        {/* RÉSULTATS & GRAPHIQUES */}
        <div className="sb-results">
          <WarningBanner warnings={warnings} />

          {/* FICHES CLÉS */}
          <section className="sb-section" aria-labelledby="ret-fiches">
            <h2 id="ret-fiches">Résultats clés</h2>
            <p className="sb-help">
              Comparaison entre votre scénario et la référence (sans levier) sous les hypothèses COR et santé sélectionnées.
            </p>
            <div className="sb-snaps">
              {snapshots.map((s) => (
                <div key={s.year} className="sb-snap">
                  <h3>{s.titre} <span className="sb-muted">({s.year})</span></h3>
                  <dl>
                    <div>
                      <dt>Dette publique</dt>
                      <dd>
                        <strong>{fmt(s.debtRatio, 1)} % du PIB</strong>
                        <DeltaLine value={s.debtDelta} unit="pt" lowerIsBetter />
                      </dd>
                    </div>
                    <div>
                      <dt>Solde total APU</dt>
                      <dd>
                        <strong>{fmt(s.balanceRatio, 2)} % du PIB</strong>
                        <DeltaLine value={s.balanceDelta} unit="pt" lowerIsBetter={false} />
                      </dd>
                    </div>
                    <div>
                      <dt>Solde sécurité sociale (ASSO)</dt>
                      <dd>
                        <strong>{fmt(s.assoBalance, 1)} Md€</strong>{' '}
                        <span className="sb-muted">({fmt(s.assoBalanceRatio, 2)} % PIB)</span>
                        <DeltaLine value={s.assoDelta} unit="Md€" lowerIsBetter={false} />
                      </dd>
                    </div>
                    <div>
                      <dt>Dépenses retraites COR (réf.)</dt>
                      <dd><strong>{fmt(s.corSpendingPct, 1)} % du PIB</strong></dd>
                    </div>
                    <div>
                      <dt>Écart de PIB (dont offre yS)</dt>
                      <dd>
                        <strong>{fmt(s.gdpGap, 2, { signed: true })} %</strong>{' '}
                        <span className="sb-muted">(offre : {fmt(s.supplyGdpPct, 2, { signed: true })} %)</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Charge d'intérêts</dt>
                      <dd>
                        <strong>{fmt(s.interest, 1)} Md€</strong>{' '}
                        <span className="sb-muted">({fmt(s.interestRatio, 2)} % PIB)</span>
                        <DeltaLine value={s.interestDelta} unit="Md€" lowerIsBetter />
                      </dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
            <TargetsSummary targets={targets} showEuNetExp={false} />
          </section>

          {/* GRAPHIQUES */}
          <section className="sb-section" aria-labelledby="ret-charts">
            <h2 id="ret-charts">Trajectoires</h2>
            <p className="sb-help">
              Trait plein : votre scénario. Pointillés longs : la référence sans levier (pour les variantes COR et santé choisies).
              {warnings.tier1 && ` Pointillé orangé : seuil de ${W.tier1DebtPct} % de dette (record du Japon) et année où il est franchi.`}
              {warnings.tier2 && ' Trait gris pointillé après la ligne rouge : trajectoire hors de toute expérience historique (le modèle ne décrit plus une situation réaliste ; l\'axe vertical l\'ignore).'}
            </p>
            <div className="sb-charts">
              {/* Graphique 1 : Dérive vieillissement vs leviers retraites + effet d'offre */}
              <figure className="sb-chart" aria-label="Dérive vieillissement, leviers retraites et effet d'offre (% du PIB)">
                <figcaption>Vieillissement, leviers retraites et offre <span className="sb-muted">(% du PIB)</span></figcaption>
                <ResponsiveContainer width="100%" height={235}>
                  <LineChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => fmt(v, 1)} />
                    <Tooltip formatter={(v) => `${fmt(v, 2)} % du PIB`} labelFormatter={(y) => `Année ${y}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="ageingDriftPct" name="Dérive vieillissement (+ = dépense)" stroke="#b71c1c" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    <Line
                      type="monotone"
                      dataKey="pensionLeversPct"
                      name={ndcActive ? 'Leviers et module retraites ASSO (+ = économie)' : 'Leviers retraites ASSO (+ = économie)'}
                      stroke="#5c6bc0"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line type="monotone" dataKey="supplyGdpPct" name="Effet d'offre PIB (yS seniors)" stroke="#2e7d32" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </figure>

              {/* Graphique 2 : Solde sécurité sociale (ASSO) */}
              <DualLineChart
                id="asso"
                titre="Solde de la sécurité sociale (ASSO)"
                unite="% du PIB"
                data={splitSeries}
                dataKey="assoBalance"
                refKey="assoBalanceRef"
                dec={2}
                tier1={warnings.tier1}
                tier2={warnings.tier2}
              />

              {/* Graphique 3 : Dette publique */}
              <DualLineChart
                id="debt"
                titre="Dette publique"
                unite="% du PIB"
                data={splitSeries}
                dataKey="debt"
                refKey="debtRef"
                dec={1}
                tier1={warnings.tier1}
                tier2={warnings.tier2}
                isDebt
              />

              {/* Graphique 4 : Solde public total */}
              <DualLineChart
                id="balance"
                titre="Solde public total (APU)"
                unite="% du PIB"
                data={splitSeries}
                dataKey="balance"
                refKey="balanceRef"
                dec={2}
                tier1={warnings.tier1}
                tier2={warnings.tier2}
                isBalance
              />
            </div>
          </section>

          {/* DÉCOMPOSITION & BLOCS */}
          <DecompositionTable decomposition={decomposition} years={result.years} yearIdx={yearIdx} onYear={setYearIdx} />
          <BlocksTable blocks={blocks} year={result.years[yearIdx]} />

          {/* CONTEXTE DÉMOGRAPHIQUE V2 */}
          <section className="sb-section" aria-labelledby="ret-contexte">
            <h2 id="ret-contexte">Contexte démographique (COR 2026 &amp; Commission européenne 2024)</h2>
            <div className="demographic-context">
              <div className="ret-demo-card">
                <h3>Droit en vigueur (LFSS 2026)</h3>
                <p>
                  La LFSS 2026 gèle l'âge légal à <strong>62 ans et 9 mois</strong> et la durée d'assurance à 170 trimestres
                  pour la génération 1964 et le T1 1965 jusqu'en <strong>janvier {ageUpStartYear}</strong> <CitedText text="[S15][S16][S23]" />,
                  avant reprise vers {LEGAL_AGE_BASE} ans (atteint pour la génération 1969 en 2033). Le levier âge légal démarre
                  en {ageUpStartYear} en hausse accélérée (plein effet {ageUpFullYear}) et en {ageDownStartYear} en baisse (plein effet {ageDownFullYear}),
                  sans double compte des cotisations retraites et avec {fmt(ageOffsetPct, 0)} % de reports sociaux <CitedText text="[S27]" />.
                </p>
              </div>
              <div className="ret-demo-card">
                <h3>Trajectoire COR (juin 2026)</h3>
                <p>
                  Dépenses de retraites à droit en vigueur (scénario central) :{' '}
                  {Object.entries(COR_PARAM.value).map(([y, v], i, arr) => (
                    <span key={y}><strong>{fmt(v, 1)} %</strong>{i === 0 ? ' du PIB' : ''} en {y}{i < arr.length - 1 ? ', ' : ''}</span>
                  ))}{' '}
                  ({fmt(COR_PARAM.low[COR_LAST_YEAR], 1)} % à productivité haute 1,0 % ; {fmt(COR_PARAM.high[COR_LAST_YEAR], 1)} %
                  à productivité basse 0,4 % <CitedText text="[S23]" />). Solde du système : −0,2 % en 2025, −0,9 pt en
                  2045, −2,4 pts en 2070 <CitedText text="[S23]" />.
                </p>
              </div>
              <div className="ret-demo-card">
                <h3>Santé et soins de longue durée</h3>
                <p>
                  Commission européenne (<em>2024 Ageing Report</em>, tableau 5) : dépense publique de santé de 8,4 % du PIB
                  en {AGEING_REPORT_YEARS.from}, en hausse de{' '}
                  <strong>{fmt(healthRiseOverSpan(SANTE_PARAM.value), 1, { signed: true })} pt</strong> d'ici{' '}
                  {AGEING_REPORT_YEARS.to} hors dépendance, et de{' '}
                  <strong>{fmt(healthRiseOverSpan(SANTE_PARAM.high), 1, { signed: true })} pt</strong> en incluant les soins
                  de longue durée ({fmt(healthRiseOverSpan(SANTE_PARAM.high - SANTE_PARAM.value), 1, { signed: true })} pt).
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
