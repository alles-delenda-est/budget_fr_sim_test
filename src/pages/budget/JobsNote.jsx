import { SUPPLY_BY_LEVER } from '../../engine/supply.js'
import { fmt, fmtJobs, jobsNote } from './helpers'

/**
 * Note sous un levier doté d'une conversion emplois (âge légal) : σ retenu pour le cas d'offre choisi et nombre d'emplois
 * qu'il implique, à comparer à la fourchette externe. Tous les nombres viennent des paramètres (aucun littéral ici).
 */
export default function JobsNote({ leverId, x, P, ysCase, className = 'sb-lever-note' }) {
  const note = jobsNote(leverId, x, P, ysCase)
  if (!note) return null
  const reg = SUPPLY_BY_LEVER[leverId]
  const [one, many] = reg.emploisUnite ?? ['unité', 'unités']
  const showX = Number.isFinite(x) && x !== 0 && x !== 1 && note.jobsForX !== null
  return (
    <p className={className}>
      Effet d'offre retenu (cas {note.caseLabel}) : <strong>{fmt(note.sigma, 2, { signed: true })} % du PIB</strong> à terme{' '}
      {reg.emploisParUnite ?? 'par unité'}, soit environ <strong>{fmtJobs(note.jobsPerUnit)} emplois</strong>
      {note.range && <> ({note.range.libelle} : {fmtJobs(note.range.low)} à {fmtJobs(note.range.high)})</>}.
      {showX && (
        <> Pour le réglage choisi ({fmt(x, 1, { signed: true })} {Math.abs(x) >= 2 ? many : one}) :{' '}
          environ <strong>{fmtJobs(note.jobsForX, { signed: true })} emplois</strong>.</>
      )}
    </p>
  )
}
