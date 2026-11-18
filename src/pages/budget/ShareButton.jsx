import { useState, useRef } from 'react'

/** Bouton « Copier le lien du scénario » : presse-papiers, ou à défaut champ sélectionné à copier à la main. */
export default function ShareButton({ getUrl }) {
  const [status, setStatus] = useState({ kind: 'idle', url: '' })
  const inputRef = useRef(null)

  const copy = async () => {
    const url = getUrl()
    try {
      if (!navigator.clipboard?.writeText) throw new Error('presse-papiers indisponible')
      await navigator.clipboard.writeText(url)
      setStatus({ kind: 'ok', url })
    } catch {
      setStatus({ kind: 'manual', url })
      // Le champ apparaît au rendu suivant : on le sélectionne alors.
      setTimeout(() => inputRef.current?.select(), 0)
    }
  }

  return (
    <div className="sb-share">
      <button type="button" className="sb-btn" onClick={copy}>Copier le lien du scénario</button>
      <span role="status" aria-live="polite" className="sb-share-status">
        {status.kind === 'ok' && 'Lien copié.'}
        {status.kind === 'manual' && 'Copie automatique impossible : copiez le lien ci-dessous (Ctrl+C).'}
      </span>
      {status.kind === 'manual' && (
        <input ref={inputRef} className="sb-share-url" readOnly value={status.url} aria-label="Lien du scénario" onFocus={(e) => e.target.select()} />
      )}
    </div>
  )
}
