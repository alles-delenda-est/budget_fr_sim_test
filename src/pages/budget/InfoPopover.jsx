import { useState, useId } from 'react'
import { isFlagged, paramRange } from './helpers'

/** Pastille de statut : « de mémoire », « à collecter » et « non validé » sont mises en évidence. */
export function StatusBadge({ status }) {
  if (!status) return null
  const cls = isFlagged(status) ? 'sb-badge sb-badge-flag' : 'sb-badge'
  return <span className={cls}>{status}</span>
}

/** Bouton « i » qui ouvre une zone d'explication (clic ou clavier ; fonctionne au toucher). Contenu : nœuds React, jamais de HTML brut. */
export function InfoPopover({ label, children }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="sb-info">
      <button type="button" className="sb-info-btn" aria-expanded={open} aria-controls={id}
        aria-label={`Explication : ${label}`} onClick={() => setOpen((o) => !o)}>i</button>
      {open && <span id={id} role="note" className="sb-info-body">{children}</span>}
    </span>
  )
}

/** Explication complète d'un paramètre : texte, valeur, source et statut. */
export function ParamInfo({ param }) {
  return (
    <>
      <span className="sb-info-line">{param.explanation}</span>
      <span className="sb-info-line"><strong>Valeur :</strong> {paramRange(param)}</span>
      <span className="sb-info-line"><strong>Source :</strong> {param.source ?? 'non renseignée'}</span>
      <span className="sb-info-line"><strong>Statut :</strong> <StatusBadge status={param.status} /></span>
    </>
  )
}
