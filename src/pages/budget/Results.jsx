import { fmt, deltaTone, visibleLines, HIDE_BELOW } from './helpers'
import { tier1Text, tier2Text } from './warnings'
import { InfoPopover } from './InfoPopover'

function Delta({ value, unit, lowerIsBetter }) {
  const tone = deltaTone(value, lowerIsBetter)
  return <span className={`sb-delta sb-delta-${tone}`}>{fmt(value, 1, { signed: true })} {unit} vs réf.</span>
}

/** Bandeau au-dessus des résultats : un palier 1 (trajectoire au-delà du record des économies avancées) et/ou un palier 2 (hors de toute expérience). */
export function WarningBanner({ warnings }) {
  if (!warnings?.tier1 && !warnings?.tier2) return null
  return (
    <div className="sb-warnings">
      {warnings.tier2 && <p className="sb-warning sb-warning-2" role="alert"><strong>Attention.</strong> {tier2Text(warnings.tier2)}</p>}
      {warnings.tier1 && <p className="sb-warning sb-warning-1" role="status">{tier1Text(warnings.tier1)}</p>}
    </div>
  )
}

function SnapshotCard({ titre, snap }) {
  return (
    <div className="sb-snap">
      <h3>{titre} <span className="sb-muted">({snap.year})</span></h3>
      <dl>
        <div><dt>Dette</dt><dd><strong>{fmt(snap.debtRatio, 1)} % du PIB</strong><Delta value={snap.debtDelta} unit="pt" lowerIsBetter /></dd></div>
        <div><dt>Solde</dt><dd><strong>{fmt(snap.balanceRatio, 2)} % du PIB</strong><Delta value={snap.balanceDelta} unit="pt" lowerIsBetter={false} /></dd></div>
        <div><dt>Intérêts</dt><dd><strong>{fmt(snap.interest, 1)} Md€</strong> <span className="sb-muted">({fmt(snap.interestRatio, 2)} % du PIB)</span><Delta value={snap.interestDelta} unit="Md€" lowerIsBetter /></dd></div>
      </dl>
    </div>
  )
}

export function Snapshots({ snaps }) {
  return (
    <section className="sb-section" aria-labelledby="sb-fiches">
      <h2 id="sb-fiches">Résultats clés</h2>
      <p className="sb-help">Vert : mieux que la référence ; rouge : moins bien (dette et intérêts plus bas, solde plus haut = mieux).</p>
      <div className="sb-snaps">
        {snaps.map((s) => <SnapshotCard key={s.titre} titre={s.titre} snap={s.snap} />)}
      </div>
    </section>
  )
}

const KIND_ORDER = ['statique', 'comportement', 'demande', 'offre', 'interets']
const KIND_TITLES = {
  statique: 'Mesures : effet statique', comportement: 'Réaction des contribuables', demande: 'Demande',
  offre: 'Effets d\'offre', interets: 'Intérêts',
}

export function DecompositionTable({ decomposition, years, yearIdx, onYear }) {
  const lines = visibleLines(decomposition.lines)
  const hidden = decomposition.lines.length - lines.length
  return (
    <section className="sb-section" aria-labelledby="sb-decomposition">
      <h2 id="sb-decomposition">Décomposition par cause</h2>
      <p className="sb-help">Écart de solde public entre votre scénario et la référence, en Md€, pour l'année choisie. Les lignes nulles dans le cas retenu sont masquées.</p>
      <div className="sb-yearpick">
        <label htmlFor="sb-year">Année : <strong>{decomposition.year}</strong></label>
        <input id="sb-year" type="range" className="sb-slider" min={1} max={years.length - 1} step={1} value={yearIdx} aria-valuetext={`Année ${decomposition.year}`} onChange={(e) => onYear(parseInt(e.target.value, 10))} />
      </div>
      {lines.length === 0 ? <p className="sb-empty">Aucun levier actif : le scénario est identique à la référence.</p> : (
        <table className="sb-table">
          <caption className="visually-hidden">Décomposition de l'écart de solde en {decomposition.year}</caption>
          <thead><tr><th scope="col">Cause</th><th scope="col" className="sb-num">Md€</th></tr></thead>
          <tbody>
            {KIND_ORDER.map((kind) => lines.filter((l) => l.kind === kind).map((l, i) => (
              <tr key={l.key} className={`sb-kind-${kind}`}>
                <th scope="row">
                  {i === 0 && <span className="sb-kind-title">{KIND_TITLES[kind]}</span>}
                  {l.label}
                  {l.gdpPct !== undefined && Math.abs(l.gdpPct) >= 0.0005 && <span className="sb-muted"> · PIB {fmt(l.gdpPct, 3, { signed: true })} %</span>}
                  {l.detail && <InfoPopover label={l.label}><span className="sb-info-line">{l.detail}</span></InfoPopover>}
                </th>
                <td className="sb-num">{fmt(l.montant, 1, { signed: true })}</td>
              </tr>
            )))}
          </tbody>
          <tfoot><tr><th scope="row">Écart de solde total</th><td className="sb-num">{fmt(decomposition.ecart, 1, { signed: true })}</td></tr></tfoot>
        </table>
      )}
      {hidden > 0 && <p className="sb-help">{hidden} ligne(s) inférieure(s) à {fmt(HIDE_BELOW, 2)} Md€ masquée(s) ; le total les inclut.</p>}
    </section>
  )
}

export function BlocksTable({ blocks, year }) {
  return (
    <section className="sb-section" aria-labelledby="sb-blocs">
      <h2 id="sb-blocs">Trois blocs en {year}</h2>
      <p className="sb-help">Solde de chaque bloc après charge d'intérêts. Le bloc local ne reçoit pas de levier propre : il reçoit sa part des fonctions de dépense partagées avec l'État (clé de répartition provisoire).</p>
      <table className="sb-table">
        <thead><tr><th scope="col">Bloc</th><th scope="col" className="sb-num">Solde (Md€)</th><th scope="col" className="sb-num">% PIB</th><th scope="col" className="sb-num">vs réf. (Md€)</th></tr></thead>
        <tbody>
          {blocks.map((b) => (
            <tr key={b.id}>
              <th scope="row">{b.label}</th>
              <td className="sb-num">{fmt(b.balance, 1)}</td>
              <td className="sb-num">{fmt(b.balanceRatio, 2)}</td>
              <td className="sb-num">{fmt(b.delta, 1, { signed: true })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
