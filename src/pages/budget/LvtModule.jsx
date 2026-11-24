import { useId } from 'react'
import { LVT_MODULE, LVT_START_YEAR } from '../../engine/lvt-module.js'
import { LVT_SCENARIOS, LVT_PROVENANCE } from '../../engine/lvt-snapshot.js'
import { fmt, moduleBlockRows } from './helpers'
import { InfoPopover, StatusBadge } from './InfoPopover'

const OPTIONS = [{ code: 0, libelle: 'Inactif (par défaut)' }, ...LVT_SCENARIOS.map((s) => ({ code: s.code, libelle: s.libelle }))]

/** Réglage du module « taxe sur la valeur du sol » : scénario (0 = inactif) et option de la borne haute de l'OCDE. */
export function LvtModuleControl({ lvt, onChange }) {
  const selectId = useId()
  const checkId = useId()
  const ocdeAvailable = lvt.scenario >= 2
  return (
    <fieldset className="sb-group sb-module">
      <legend>Module : taxe sur la valeur du sol</legend>
      <div className="sb-lever-head">
        <StatusBadge status={LVT_MODULE.statut} />
        <InfoPopover label={LVT_MODULE.titre}>
          {LVT_MODULE.explications.map((e) => <span key={e} className="sb-info-line">{e}</span>)}
          <span className="sb-info-sub"><strong>Sources :</strong> {LVT_MODULE.sources.join(' ; ')}</span>
        </InfoPopover>
      </div>
      <p className="sb-help">Remplace des impôts existants par une taxe sur la valeur du sol, à rendement égal, dès {LVT_START_YEAR}. Seule la capitalisation nette dans les prix (baisse due à la nouvelle taxe moins hausse due aux impôts nationaux supprimés, part du sol seulement) change le solde consolidé, en entier dès {LVT_START_YEAR}.</p>
      <LvtProvenance />
      <label htmlFor={selectId} className="sb-module-label">Scénario</label>
      <select id={selectId} className="sb-module-select" value={lvt.scenario}
        onChange={(e) => onChange({ ...lvt, scenario: parseInt(e.target.value, 10) })}>
        {OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.libelle}</option>)}
      </select>
      <div className="sb-module-check">
        <input id={checkId} type="checkbox" checked={ocdeAvailable && lvt.ocde === 1} disabled={!ocdeAvailable}
          onChange={(e) => onChange({ ...lvt, ocde: e.target.checked ? 1 : 0 })} />
        <label htmlFor={checkId}>Inclure la borne haute de l'OCDE dans le cas « haut » des effets d'offre (S2 et S3, non validé)</label>
      </div>
    </fieldset>
  )
}

/** Provenance des rendements : commit LVTShift épinglé, date des données (as_of) et date d'import, lien vers le fichier à ce commit. */
export function LvtProvenance() {
  return (
    <p className="sb-help sb-provenance">
      <a href={LVT_PROVENANCE.url} target="_blank" rel="noopener noreferrer" title={`${LVT_PROVENANCE.depot}, ${LVT_PROVENANCE.fichier}, commit ${LVT_PROVENANCE.commitComplet}`}>{LVT_PROVENANCE.texte}</a>.
    </p>
  )
}

/** Sorties du module, par bloc, l'année choisie : flux bruts (affichage seulement) et effet net sur le solde de chaque bloc (D9). */
export function LvtModuleResults({ result, yearIdx }) {
  const run = result.modules.find((m) => m.id === LVT_MODULE.id)
  if (!run) return null
  const year = result.years[yearIdx]
  const rows = moduleBlockRows(result, yearIdx, LVT_MODULE.id)
  const specific = run.explications.slice(LVT_MODULE.explications.length)
  return (
    <section className="sb-section" aria-labelledby="sb-module-lvt">
      <h2 id="sb-module-lvt">Taxe sur la valeur du sol en {year} <StatusBadge status={run.statut} /></h2>
      <ul className="sb-module-notes">
        {specific.map((e) => <li key={e}>{e}</li>)}
      </ul>
      <p className="sb-help">Flux bruts : impôts supprimés et taxe créée, pour information ; ils ne s'ajoutent pas au solde. L'effet net de chaque bloc est inclus dans son solde (tableau « Trois blocs »). Le bloc local reçoit les sorties du module comme les autres blocs.</p>
      <table className="sb-table">
        <caption className="visually-hidden">Flux bruts et effet net du module par bloc en {year}</caption>
        <thead><tr><th scope="col">Bloc et ligne</th><th scope="col" className="sb-num">Md€</th><th scope="col" className="sb-num">% PIB</th></tr></thead>
        {rows.map((b) => (
          <tbody key={b.id}>
            <tr className="sb-module-block"><th scope="rowgroup" colSpan={3}>{b.label}</th></tr>
            {b.flux.map((f) => (
              <tr key={f.libelle} className="sb-module-flux">
                <th scope="row">{f.libelle} <span className="sb-muted">(flux brut)</span></th>
                <td className="sb-num">{fmt(f.montant, 1, { signed: true })}</td>
                <td className="sb-num">{fmt(f.pct, 2, { signed: true })}</td>
              </tr>
            ))}
            <tr className="sb-module-net">
              <th scope="row">Effet net sur le solde du bloc</th>
              <td className="sb-num">{fmt(b.net, 1, { signed: true })}</td>
              <td className="sb-num">{fmt(b.netPct, 2, { signed: true })}</td>
            </tr>
          </tbody>
        ))}
      </table>
      <details className="sb-module-details">
        <summary>Ce que fait le module et ses limites</summary>
        <ul>{LVT_MODULE.explications.map((e) => <li key={e}>{e}</li>)}</ul>
        <LvtProvenance />
      </details>
    </section>
  )
}
