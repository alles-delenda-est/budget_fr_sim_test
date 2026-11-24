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
  const down = Number.isFinite(x) && x < 0
  const showX = Number.isFinite(x) && x !== 0 && Math.abs(x) !== 1 && note.jobsForX !== null
  const sigma = down ? -Math.abs(note.sigma) : note.sigma
  const moins = down ? ' en moins' : ''
  return (
    <p className={className}>
      Effet d'offre retenu (cas {note.caseLabel}{down ? ', pour une baisse' : ''}) :{' '}
      <strong>{fmt(sigma, 2, { signed: true })} % du PIB</strong> à terme {reg.emploisParUnite ?? 'par unité'}{moins}, soit environ{' '}
      <strong>{fmtJobs(note.jobsPerUnit)} emplois{moins}</strong>
      {note.range && <> ({note.range.libelle} : {fmtJobs(note.range.low)} à {fmtJobs(note.range.high)})</>}.
      {showX && (
        <> Pour le réglage choisi ({fmt(x, 1, { signed: true })} {Math.abs(x) >= 2 ? many : one}) :{' '}
          environ <strong>{down ? `${fmtJobs(Math.abs(note.jobsForX))} emplois en moins` : `${fmtJobs(note.jobsForX, { signed: true })} emplois`}</strong>.</>
      )}
    </p>
  )
}
