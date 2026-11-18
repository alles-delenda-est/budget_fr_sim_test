import { useState, useMemo } from 'react'
import { projectScenario, HORIZONS } from '../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../engine/params.js'
import LeverPanel from './budget/LeverPanel'
import Charts from './budget/Charts'
import { Snapshots, DecompositionTable, BlocksTable } from './budget/Results'
import { InfoPopover, ParamInfo, StatusBadge } from './budget/InfoPopover'
import { buildSeries, snapshotAt, decomposeAtYear, hasSupplyEffect, blocksAt, paramIdsFor, extremeLevers, SUPPLY_CASES } from './budget/helpers'
import './SimulateurBudgetPage.css'

const P = resolveParams()
const EPS = P['fisc.eps']
const DEFAULT_YEAR_IDX = 5

export default function SimulateurBudgetPage() {
  const [values, setValues] = useState({})
  const [horizon, setHorizon] = useState('dixAns')
  const [ysCase, setYsCase] = useState('central')
  const [yearIdxRaw, setYearIdx] = useState(DEFAULT_YEAR_IDX)

  // Référence (sans levier) et scénario : recalculés seulement si leviers, horizon ou cas changent.
  const reference = useMemo(() => projectScenario({ levers: {}, horizon, ysCase }), [horizon, ysCase])
  const result = useMemo(() => projectScenario({ levers: values, horizon, ysCase }), [values, horizon, ysCase])

  const N = result.years.length - 1
  const yearIdx = Math.min(Math.max(yearIdxRaw, 1), N)

  const series = useMemo(() => buildSeries(result, reference), [result, reference])
  const snaps = useMemo(() => [
    { titre: 'Année 1', snap: snapshotAt(result, reference, 1) },
    { titre: 'Année 5', snap: snapshotAt(result, reference, Math.min(5, N)) },
    { titre: 'Fin d\'horizon', snap: snapshotAt(result, reference, N) },
  ], [result, reference, N])
  const decomposition = useMemo(() => decomposeAtYear(result, reference, yearIdx, EPS), [result, reference, yearIdx])
  const blocks = useMemo(() => blocksAt(result, reference, yearIdx), [result, reference, yearIdx])
  const paramIds = useMemo(() => paramIdsFor(values, result), [values, result])

  // Aucune ligne d'offre non nulle dans le résultat du moteur : le choix bas / central / haut ne change rien.
  const noSupplyEffect = !hasSupplyEffect(result)

  const setLever = (id, x) => setValues((v) => ({ ...v, [id]: x }))

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

      <div className="sb-layout">
        <LeverPanel values={values} onChange={setLever} onReset={() => setValues({})} onExtreme={(w) => setValues(extremeLevers(w))} P={P} />
        <div className="sb-results">
          <Snapshots snaps={snaps} />
          <Charts data={series} />
          <DecompositionTable decomposition={decomposition} years={result.years} yearIdx={yearIdx} onYear={setYearIdx} />
          <BlocksTable blocks={blocks} year={result.years[yearIdx]} />
          <section className="sb-section" aria-labelledby="sb-params">
            <h2 id="sb-params">Hypothèses utilisées</h2>
            <p className="sb-help">Paramètres qui pèsent sur le scénario affiché, avec leur source et leur statut.</p>
            <ul className="sb-params">
              {paramIds.map((id) => (
                <li key={id}>
                  <code>{id}</code> <StatusBadge status={PARAM_BY_ID[id].status} />
                  <InfoPopover label={id}><ParamInfo param={PARAM_BY_ID[id]} /></InfoPopover>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
