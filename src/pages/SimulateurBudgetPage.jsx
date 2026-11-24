import { useState, useMemo, useEffect } from 'react'
import { projectScenario, HORIZONS } from '../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../engine/params.js'
import LeverPanel from './budget/LeverPanel'
import Charts from './budget/Charts'
import { Snapshots, DecompositionTable, BlocksTable, WarningBanner } from './budget/Results'
import { evaluateWarnings } from './budget/warnings'
import ShareButton from './budget/ShareButton'
import { buildCsv, buildExportRows, downloadCsv } from './budget/exportCsv'
import { versionStamp } from '../version'
import { decodeScenario, queryFromHash, scenarioHash, scenarioUrl, DEFAULT_LVT } from './budget/share'
import { LvtModuleControl, LvtModuleResults } from './budget/LvtModule'
import { LVT_MODULE, LVT_PARAM_IDS } from '../engine/lvt-module.js'
import { LVT_SCENARIO_BY_CODE } from '../engine/lvt-snapshot.js'
import { InfoPopover, ParamInfo, StatusBadge } from './budget/InfoPopover'
import { buildSeries, snapshotAt, decomposeAtYear, hasSupplyEffect, blocksAt, paramIdsFor, extremeLevers, fmt, SUPPLY_CASES } from './budget/helpers'
import { NEUTRAL_SCENARIOS, MACRO_VARIANT_BY_ID, overridesForMacro, matchesScenario } from './budget/presets'
import './SimulateurBudgetPage.css'

const P = resolveParams()
const EPS = P['fisc.eps']
const EPS_OFFRE = P['fisc.eps_offre']
const DEFAULT_YEAR_IDX = 5

export default function SimulateurBudgetPage() {
  // Scénario lu une seule fois dans l'adresse (#/budget?h=…&cas=…&m=…&levier=…), validé par decodeScenario.
  const [initial] = useState(() => decodeScenario(queryFromHash(window.location.hash)))
  const [values, setValues] = useState(initial.values)
  const [horizon, setHorizon] = useState(initial.horizon)
  const [ysCase, setYsCase] = useState(initial.ysCase)
  const [macroId, setMacroId] = useState(initial.macroId)
  const [lvt, setLvt] = useState(initial.lvt ?? DEFAULT_LVT)
  const [yearIdxRaw, setYearIdx] = useState(DEFAULT_YEAR_IDX)

  const macroVariant = macroId && Object.hasOwn(MACRO_VARIANT_BY_ID, macroId) ? MACRO_VARIANT_BY_ID[macroId] : null
  const overrides = useMemo(() => overridesForMacro(macroId), [macroId])
  // Module « taxe sur la valeur du sol » : inactif par défaut (scénario 0) ; la borne OCDE n'a de sens qu'en S2 et S3.
  const lvtScenario = LVT_SCENARIO_BY_CODE[lvt.scenario] ?? null
  const lvtSetting = useMemo(() => (lvtScenario ? { scenario: lvtScenario.code, ocde: lvtScenario.code >= 2 && lvt.ocde === 1 ? 1 : 0 } : null), [lvtScenario, lvt.ocde])
  const modules = useMemo(() => (lvtSetting ? [{ module: LVT_MODULE, levers: { scenario: lvtSetting.scenario, offre_ocde: lvtSetting.ocde } }] : []), [lvtSetting])

  // Référence (médiane des prévisionnistes indépendants, sans levier) et scénario : recalculés seulement si nécessaire.
  const reference = useMemo(() => projectScenario({ levers: {}, horizon, ysCase }), [horizon, ysCase])
  const result = useMemo(() => projectScenario({ levers: values, overrides, horizon, ysCase, modules }), [values, overrides, horizon, ysCase, modules])

  const N = result.years.length - 1
  const yearIdx = Math.min(Math.max(yearIdxRaw, 1), N)

  const warnings = useMemo(() => evaluateWarnings(result), [result])
  const series = useMemo(() => buildSeries(result, reference), [result, reference])
  const snaps = useMemo(() => [
    { titre: 'Année 1', snap: snapshotAt(result, reference, 1) },
    { titre: 'Année 5', snap: snapshotAt(result, reference, Math.min(5, N)) },
    { titre: 'Fin d\'horizon', snap: snapshotAt(result, reference, N) },
  ], [result, reference, N])
  const decomposition = useMemo(() => decomposeAtYear(result, reference, yearIdx, EPS, EPS_OFFRE), [result, reference, yearIdx])
  const blocks = useMemo(() => blocksAt(result, reference, yearIdx), [result, reference, yearIdx])
  const paramIds = useMemo(() => [...new Set([...paramIdsFor(values, result, macroId), ...(lvtSetting ? LVT_PARAM_IDS : [])])].filter((id) => PARAM_BY_ID[id]), [values, result, macroId, lvtSetting])

  // Aucune ligne d'offre non nulle dans le résultat du moteur : le choix bas / central / haut ne change rien.
  const noSupplyEffect = !hasSupplyEffect(result)

  // Adresse du scénario mise à jour sans entrée d'historique, avec un délai pour ne pas écrire à chaque cran de curseur.
  useEffect(() => {
    const timer = setTimeout(() => {
      window.history.replaceState(window.history.state, '', scenarioHash({ values, horizon, ysCase, macroId, lvt: lvtSetting }))
    }, 300)
    return () => clearTimeout(timer)
  }, [values, horizon, ysCase, macroId, lvtSetting])

  const exportCsv = () => {
    const csv = buildCsv({
      stamp: versionStamp(), url: scenarioUrl(window.location, { values, horizon, ysCase, macroId, lvt: lvtSetting }),
      horizonLabel: HORIZONS[horizon].label, ysCase, macroLabel: macroVariant?.label ?? null, values, rows: buildExportRows(result, reference, EPS, EPS_OFFRE),
      modules: lvtScenario ? [[`Module ${LVT_MODULE.titre}`, `${lvtScenario.libelle}${lvtSetting.ocde ? ' ; borne haute OCDE incluse dans le cas « haut »' : ''}`]] : [],
    })
    downloadCsv(csv, `simulateur-budget-${horizon}-${ysCase}${macroId ? `-${macroId}` : ''}${lvtScenario ? `-lvt-${lvtScenario.id}` : ''}.csv`)
  }

  const setLever = (id, x) => setValues((v) => ({ ...v, [id]: x }))
  const applyScenario = (scenario) => {
    setValues({ ...scenario.levers })
    setMacroId(scenario.macroId ?? null)
  }

  return (
    <div className="sb-page">
      <header>
        <h1 className="sb-title">Simulateur budgétaire</h1>
        <p className="sb-help">Moteur v2 : trois blocs (État et ODAC, sécurité sociale, collectivités), effets d'offre explicites, référence sans levier. Les paramètres « de mémoire », « à collecter » ou « non validé » sont signalés : ils ne sont pas encore sourcés.</p>
      </header>

      <section className="sb-section" aria-labelledby="sb-options">
        <h2 id="sb-options">Horizon et effets d'offre</h2>
        <div className="sb-options">
          <div>
            <label htmlFor="sb-horizon">Horizon</label>
            <select id="sb-horizon" value={horizon} onChange={(e) => setHorizon(e.target.value)}>
              {Object.values(HORIZONS).map((h) => <option key={h.id} value={h.id}>{h.label} (jusqu'en {h.endYear})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sb-case">Cas des effets d'offre</label>
            <select id="sb-case" aria-describedby={noSupplyEffect ? 'sb-case-hint' : undefined} value={ysCase} onChange={(e) => setYsCase(e.target.value)}>
              {SUPPLY_CASES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            {noSupplyEffect && <p className="sb-hint" id="sb-case-hint">Sans effet pour les leviers choisis</p>}
          </div>
        </div>
        <p className="sb-help">Bas et haut désignent les résultats les moins et les plus favorables pour le PIB, et non l'ordre statistique des valeurs (σ). Au-delà de dix ans, lisez les trois cas ensemble : le modèle reste déterministe.</p>
      </section>

      <section className="sb-section" aria-labelledby="sb-partage">
        <h2 id="sb-partage">Partager et exporter</h2>
        <p className="sb-help">Le lien reprend les leviers, l'horizon, le cas des effets d'offre, l'éventuel comparateur macroéconomique et le module « taxe sur la valeur du sol » s'il est actif ; il rouvre exactement ce scénario. L'export CSV (séparateur « ; », virgule décimale, ouverture directe dans Excel) donne, année par année, le scénario, la référence et la décomposition par cause.</p>
        <div className="sb-toolbar">
          <ShareButton getUrl={() => scenarioUrl(window.location, { values, horizon, ysCase, macroId, lvt: lvtSetting })} />
          <button type="button" className="sb-btn" onClick={exportCsv}>Exporter (CSV)</button>
        </div>
      </section>

      <section className="sb-section" aria-labelledby="sb-scenarios">
        <h2 id="sb-scenarios">Scénarios types (neutres)</h2>
        <p className="sb-help">Points de départ illustratifs, sans programme partisan. Cliquer un scénario règle les curseurs correspondants (ou active un comparateur macroéconomique) ; vous pouvez ensuite ajuster librement chaque levier.</p>
        <div className="sb-presets" role="group" aria-label="Scénarios types neutres">
          {NEUTRAL_SCENARIOS.map((sc) => {
            const active = matchesScenario(sc, values, macroId)
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
      </section>

      <div className="sb-layout">
        <LeverPanel values={values} onChange={setLever} onReset={() => { setValues({}); setLvt(DEFAULT_LVT) }} onExtreme={(w) => setValues(extremeLevers(w))} P={P} ysCase={ysCase}>
          <LvtModuleControl lvt={lvt} onChange={setLvt} />
        </LeverPanel>
        <div className="sb-results">
          {macroVariant && (
            <div className="sb-macro-banner" role="status">
              <div className="sb-macro-banner-text">
                <strong>Comparateur macroéconomique actif : {macroVariant.label}</strong>
                <p>{macroVariant.description} Vous pouvez combiner des leviers budgétaires sur cette trajectoire ou revenir à la référence indépendante.</p>
              </div>
              <button type="button" className="sb-btn" onClick={() => setMacroId(null)}>Revenir à la référence indépendante</button>
            </div>
          )}
          <WarningBanner warnings={warnings} />
          <Snapshots snaps={snaps} />
          <Charts data={series} tier1={warnings.tier1} tier2={warnings.tier2} hasMacroOverride={Boolean(macroVariant)} />
          <DecompositionTable decomposition={decomposition} years={result.years} yearIdx={yearIdx} onYear={setYearIdx} />
          <BlocksTable blocks={blocks} year={result.years[yearIdx]} />
          <LvtModuleResults result={result} yearIdx={yearIdx} />
          <section className="sb-section" aria-labelledby="sb-params">
            <h2 id="sb-params">Hypothèses utilisées</h2>
            <p className="sb-help">Paramètres qui pèsent sur le scénario affiché, avec leur source et leur statut.</p>
            <ul className="sb-params">
              {paramIds.map((id) => {
                const param = PARAM_BY_ID[id]
                const overridden = overrides && Object.hasOwn(overrides, id) ? overrides[id] : null
                return (
                  <li key={id}>
                    <code>{id}</code> <StatusBadge status={param.status} />
                    {overridden !== null && (
                      <> <span className="sb-badge sb-badge-override">comparateur : {fmt(overridden, 1)} {param.unit}</span></>
                    )}
                    <InfoPopover label={id}>
                      {overridden !== null && (
                        <span className="sb-info-line"><strong>Valeur du comparateur actif :</strong> {fmt(overridden, 1)} {param.unit} (remplace la valeur de référence ci-dessous).</span>
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
  )
}
