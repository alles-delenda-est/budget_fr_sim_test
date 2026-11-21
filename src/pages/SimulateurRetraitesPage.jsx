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
import { LEVER_BY_ID, staticYield } from '../engine/levers.js'
import { WARNING_THRESHOLDS as W } from '../config.js'
import {
  fmt,
  deltaTone,
  niceAxis,
  decomposeAtYear,
  blocksAt,
  hasSupplyEffect,
  SUPPLY_CASES,
} from './budget/helpers'
import { evaluateWarnings, splitSeriesAtYear, visibleDomain } from './budget/warnings'
import { WarningBanner, DecompositionTable, BlocksTable } from './budget/Results'
import { InfoPopover, ParamInfo, StatusBadge } from './budget/InfoPopover'
import {
  LEGAL_AGE_BASE,
  COR_VARIANTS,
  HEALTH_VARIANTS,
  UNVALIDATED_PENSION_ITEMS,
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

function DeltaLine({ value, unit, lowerIsBetter }) {
  const tone = deltaTone(value, lowerIsBetter)
  return <span className={`sb-delta sb-delta-${tone}`}>{fmt(value, 1, { signed: true })} {unit} vs réf.</span>
}

function extentOf(data, key, refKey, domain) {
  if (domain) return domain
  const vals = data.flatMap((r) => [r[key], r[refKey]]).filter(Number.isFinite)
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [NaN, NaN]
}

function DualLineChart({ id, titre, unite, data, dataKey, refKey, dec = 1, tier1 = null, tier2 = null, isDebt = false }) {
  const tick = { fontSize: 11 }
  const beyond = tier2 ? `${dataKey}Beyond` : null
  const domain = visibleDomain(data, dataKey, refKey, tier2?.year)
  const nice = isDebt ? niceAxis(...extentOf(data, dataKey, refKey, domain), { minStep: 10 }) : null
  const lastYear = data.length ? data[data.length - 1].year : null

  return (
    <figure className="sb-chart" aria-label={`${titre} (${unite})`} data-chart-id={id}>
      <figcaption>{titre} <span className="sb-muted">({unite})</span></figcaption>
      <ResponsiveContainer width="100%" height={235}>
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
              label={{ value: 'Hors expérience', position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' }}
            />
          )}
          {isDebt && (
            <ReferenceLine
              y={W.tier1DebtPct}
              stroke="#bf4000"
              strokeDasharray="2 4"
              ifOverflow="hidden"
              label={{ value: `${W.tier1DebtPct} %`, position: 'insideBottomLeft', fontSize: 10, fill: '#bf4000' }}
            />
          )}
          {isDebt && tier1 && <ReferenceLine x={tier1.year} stroke="#bf4000" strokeDasharray="2 4" />}
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
  const [yearIdxRaw, setYearIdx] = useState(10)

  const ageId = useId()
  const idxId = useId()

  const overrides = useMemo(
    () => buildPensionOverrides({ corVariant, healthVariant }),
    [corVariant, healthVariant],
  )
  const activeP = useMemo(() => resolveParams(overrides), [overrides])

  const levers = useMemo(() => {
    const out = {}
    if (ageDelta !== 0) out.age_legal = ageDelta
    if (indexDelta !== 0) out.indexation_pensions = indexDelta
    return out
  }, [ageDelta, indexDelta])

  const reference = useMemo(
    () => projectScenario({ levers: {}, horizon, ysCase, overrides }),
    [horizon, ysCase, overrides],
  )
  const result = useMemo(
    () => projectScenario({ levers, horizon, ysCase, overrides }),
    [levers, horizon, ysCase, overrides],
  )

  const N = result.years.length - 1
  const yearIdx = Math.min(Math.max(yearIdxRaw, 1), N)

  const warnings = useMemo(() => evaluateWarnings(result), [result])
  const series = useMemo(() => buildPensionSeries(result, reference, activeP), [result, reference, activeP])
  const splitSeries = useMemo(() => splitSeriesAtYear(series, warnings.tier2?.year), [series, warnings.tier2?.year])
  const snapshots = useMemo(() => buildPensionSnapshots(result, reference, activeP), [result, reference, activeP])
  const decomposition = useMemo(() => decomposeAtYear(result, reference, yearIdx, EPS, EPS_OFFRE), [result, reference, yearIdx])
  const blocks = useMemo(() => blocksAt(result, reference, yearIdx), [result, reference, yearIdx])
  const noSupplyEffect = !hasSupplyEffect(result)

  const ageTarget = legalAgeFromDelta(ageDelta)
  const ageStartYear = START_YEAR + AGE_LEVER.defaultRamp.start
  const ageFullYear = ageStartYear + AGE_LEVER.defaultRamp.years - 1
  const ageYield = staticYield(AGE_LEVER, ageDelta, activeP)
  const idxYield = staticYield(INDEX_LEVER, indexDelta, activeP)

  const resetLevers = () => {
    setAgeDelta(0)
    setIndexDelta(0)
  }

  return (
    <div className="sb-page ret-page">
      <header>
        <h1 className="sb-title">Simulateur Retraites</h1>
        <p className="sb-help">
          Moteur v2 (équations E1–E12) appliqué au système de retraites et au vieillissement : trajectoires du{' '}
          <strong>COR (juin 2026)</strong>, dérive santé / dépendance (Commission européenne 2024), leviers validés
          (âge légal dès janvier 2028 avec effet d'offre emploi seniors, indexation des pensions) et mesures en attente de
          validation.
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

          <fieldset className="sb-group">
            <legend>Leviers validés (actifs)</legend>
            <p className="sb-help">
              Effet sur le bloc sécurité sociale (ASSO) et, pour l'âge légal, effet d'offre sur le PIB via l'emploi des
              seniors (<code>ε_offre = {fmt(EPS_OFFRE * 100, 1)} %</code>).
            </p>

            {/* ÂGE LÉGAL */}
            <div className="sb-lever">
              <div className="sb-lever-head">
                <label htmlFor={ageId}>{AGE_LEVER.titre}</label>
                <StatusBadge status={AGE_LEVER.statut} />
                <InfoPopover label={AGE_LEVER.titre}>
                  <span className="sb-info-line">{AGE_LEVER.aide}</span>
                  <span className="sb-info-sub">
                    <strong>rend.age_legal</strong>
                    <ParamInfo param={PARAM_BY_ID['rend.age_legal']} />
                  </span>
                  <span className="sb-info-sub">
                    <strong>offre.sigma.age_legal</strong>
                    <ParamInfo param={PARAM_BY_ID['offre.sigma.age_legal']} />
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
                Calendrier LFSS 2026 : entrée en vigueur en janvier {ageStartYear}, montée en charge sur 6 ans. Effet
                d'offre emploi seniors : <strong>{fmt(PARAM_BY_ID['offre.sigma.age_legal'].value, 2, { signed: true })} %</strong>{' '}
                du PIB par année au centre (+0,15 / +0,50 %).
              </p>
            </div>

            {/* INDEXATION DES PENSIONS */}
            <div className="sb-lever">
              <div className="sb-lever-head">
                <label htmlFor={idxId}>{INDEX_LEVER.titre}</label>
                <StatusBadge status={INDEX_LEVER.statut} />
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
                  Étalon : <strong>{fmt(idxYield, 1, { signed: true })} Md€</strong>/an (dès 2027)
                </span>
              </div>
              <p className="ret-lever-note">
                −1 = 1 point sous l'inflation ({fmt(staticYield(INDEX_LEVER, -1, activeP), 1, { signed: true })} Md€/an),
                effet de niveau permanent. Décalage <code>comp.offset.prestations</code> à {fmt(activeP['comp.offset.prestations'], 1)} par défaut.
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
          </section>

          {/* GRAPHIQUES */}
          <section className="sb-section" aria-labelledby="ret-charts">
            <h2 id="ret-charts">Trajectoires</h2>
            <p className="sb-help">
              Trait plein : votre scénario. Pointillés longs : la référence sans levier (pour les variantes COR et santé choisies).
              {warnings.tier2 && ' Après la ligne rouge (palier 2), la trajectoire sort de toute expérience historique : les courbes sont grisées et l\'axe vertical les ignore.'}
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
                    <Line type="monotone" dataKey="ageingDriftPct" name="Dérive vieillissement (depuis 2025)" stroke="#b71c1c" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="pensionLeversPct" name="Leviers retraites (statique ASSO)" stroke="#5c6bc0" strokeWidth={2.5} dot={false} isAnimationActive={false} />
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
                  jusqu'en <strong>janvier 2028</strong>, avant reprise de la montée vers 64 ans. Le levier âge légal du
                  simulateur démarre donc en janvier 2028 sur une rampe de 6 ans (plein effet en 2033).
                </p>
              </div>
              <div className="ret-demo-card">
                <h3>Trajectoire COR (juin 2026)</h3>
                <p>
                  Dépenses de retraites à droit en vigueur (scénario central) : <strong>14,1 %</strong> du PIB en 2025 et
                  2030, <strong>14,2 %</strong> en 2045, <strong>15,3 %</strong> en 2070 (14,5 % à productivité haute 1,0 % ;
                  16,1 % à productivité basse 0,4 %). Solde du système : −0,2 % en 2025, −0,9 pt en 2045, −2,4 pts en 2070.
                </p>
              </div>
              <div className="ret-demo-card">
                <h3>Santé et soins de longue durée</h3>
                <p>
                  Commission européenne (<em>2024 Ageing Report</em>) : dépense publique de santé de 8,8 % du PIB en 2022,
                  en hausse de <strong>+0,3 pt</strong> d'ici 2070 hors dépendance, et de <strong>+1,0 pt</strong> en
                  incluant les soins de longue durée (+0,7 pt).
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
