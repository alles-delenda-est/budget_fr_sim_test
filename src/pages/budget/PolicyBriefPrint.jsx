import { memo, useState, useRef } from 'react'
import { fmt } from './helpers'

/**
 * Feuille d'impression A4 de la Note de synthèse (`@media print` uniquement ; masquée à l'écran).
 * Consomme exactement l'objet `briefData` produit par `buildBriefData` : parité numérique 100 % avec le Markdown,
 * zéro `dangerouslySetInnerHTML`, suivi en page 2 des graphiques vectoriels `<Charts />`.
 */
export const PolicyBriefPrint = memo(function PolicyBriefPrint({ data }) {
  if (!data) return null
  const { meta, alerts, execPoints, measures, totalExAnteMd, trajectory, stressResilience, decomposition, subsectors, assumptions } = data
  const byKey5 = Object.fromEntries(decomposition.y5.lines.map((l) => [l.key, l]))
  const byKeyEnd = Object.fromEntries(decomposition.end.lines.map((l) => [l.key, l]))
  const orderedKeys = [...new Set([...decomposition.end.lines.map((l) => l.key), ...decomposition.y5.lines.map((l) => l.key)])]
  const hasA = Boolean(meta.pinnedLabel && trajectory.some((r) => r.debtAPct !== undefined))

  return (
    <article className="sb-print-sheet" aria-label="Note de synthèse imprimable">
      <header className="sb-print-header">
        <div>
          <h1>Note de synthèse — Simulation budgétaire (APU consolidées, Maastricht)</h1>
          <p className="sb-print-meta">
            {meta.dateIso} · {meta.stamp}{meta.provisional ? ' · Version provisoire (< 1.0) — non publiée' : ''}
          </p>
          <p className="sb-print-meta">
            <strong>Horizon :</strong> {meta.horizonLabel} (2026–{meta.endYear}) ·{' '}
            <strong>Effets d&apos;offre :</strong> {meta.ysCaseNote} ·{' '}
            <strong>Montée en charge :</strong> {meta.phasingLabel}
          </p>
          <p className="sb-print-meta">
            <strong>Cadre macroéconomique :</strong> {meta.frameworkLabel} · <strong>Dynamiques :</strong> {meta.dynamicsLabel}
          </p>
          {meta.pinnedLabel && <p className="sb-print-meta"><strong>Comparaison vs Scénario A :</strong> {meta.pinnedLabel}</p>}
          {meta.url && <p className="sb-print-url">{meta.url}</p>}
        </div>
      </header>

      <section className="sb-print-exec">
        <h2>L&apos;essentiel en 3 points</h2>
        <ul>
          {execPoints.map((pt, i) => <li key={i}>{pt}</li>)}
        </ul>
        {alerts.length > 0 && (
          <div className="sb-print-alerts">
            {alerts.map((a, i) => (
              <p key={i} className={`sb-print-alert sb-print-alert-${a.level}`}>
                <strong>Alerte ({a.level}) :</strong> {a.text}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="sb-print-sec">
        <h2>1. Mesures retenues</h2>
        {measures.length === 0 ? (
          <p className="sb-print-empty">Aucun levier budgétaire actif : trajectoire de politique inchangée.</p>
        ) : (
          <table className="sb-print-table">
            <thead>
              <tr><th>Mesure</th><th>Famille</th><th>Réglage</th><th className="sb-num">Ex ante (Md€)</th><th>Calendrier</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {measures.map((m) => (
                <tr key={m.id}>
                  <td>{m.titre}</td><td>{m.family}</td><td>{m.setting}</td>
                  <td className="sb-num">{fmt(m.exAnteMd, 1, { signed: true })}</td>
                  <td>{m.calendar}</td><td>{m.status}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={3}>Total ex ante en régime permanent (base PIB 2025)</th>
                <td className="sb-num">{fmt(totalExAnteMd, 1, { signed: true })}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      <section className="sb-print-sec">
        <h2>2. Trajectoire budgétaire et macroéconomique</h2>
        <table className="sb-print-table">
          <thead>
            <tr>
              <th>Jalon</th>
              <th className="sb-num">Dette %</th>
              <th className="sb-num">Réf. %</th>
              <th className="sb-num">{hasA ? 'Scén. A %' : 'Écart pt'}</th>
              <th className="sb-num">Solde %</th>
              <th className="sb-num">Prim. %</th>
              <th className="sb-num">Int. Md€</th>
              <th className="sb-num">Écart PIB %</th>
              <th className="sb-num">Chôm. %</th>
            </tr>
          </thead>
          <tbody>
            {trajectory.map((r) => (
              <tr key={r.idx}>
                <td>{r.label}</td>
                <td className="sb-num">{fmt(r.debtPct, 1)}</td>
                <td className="sb-num">{fmt(r.debtRefPct, 1)}</td>
                <td className="sb-num">{hasA ? fmt(r.debtAPct, 1) : fmt(r.debtDeltaPp, 1, { signed: true })}</td>
                <td className="sb-num">{fmt(r.balancePct, 2)}</td>
                <td className="sb-num">{fmt(r.primaryPct, 2)}</td>
                <td className="sb-num">{fmt(r.interestMd, 1)}</td>
                <td className="sb-num">{fmt(r.gdpGapPct, 2, { signed: true })}</td>
                <td className="sb-num">{fmt(r.unemploymentPct, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {stressResilience && stressResilience.length > 0 && (
          <table className="sb-print-table sb-print-stress">
            <thead>
              <tr>
                <th>Résistance ({meta.stressTitle})</th>
                <th className="sb-num">Plan hors choc</th>
                <th className="sb-num">Plan sous choc</th>
                <th className="sb-num">Coût du choc</th>
                <th className="sb-num">Réf. sous choc</th>
                <th className="sb-num">Gain du plan</th>
              </tr>
            </thead>
            <tbody>
              {stressResilience.map((sr) => (
                <tr key={sr.year}>
                  <td>{sr.label}</td>
                  <td className="sb-num">{fmt(sr.unshockedDebtPct, 1)} %</td>
                  <td className="sb-num">{fmt(sr.shockedDebtPct, 1)} %</td>
                  <td className="sb-num">{fmt(sr.shockCostDebtPp, 1, { signed: true })} pt</td>
                  <td className="sb-num">{fmt(sr.shockedRefDebtPct, 1)} %</td>
                  <td className="sb-num">{fmt(sr.planProtectionPp, 1, { signed: true })} pt</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="sb-print-grid2">
        <section className="sb-print-sec">
          <h2>3. Décomposition du solde (Md€)</h2>
          <table className="sb-print-table">
            <thead>
              <tr><th>Composante</th><th className="sb-num">{decomposition.y5Year}</th><th className="sb-num">{decomposition.endYear}</th></tr>
            </thead>
            <tbody>
              {orderedKeys.map((k) => {
                const l5 = byKey5[k]
                const lEnd = byKeyEnd[k]
                const m5 = l5?.montant ?? 0
                const mEnd = lEnd?.montant ?? 0
                if (Math.abs(m5) < 0.05 && Math.abs(mEnd) < 0.05 && k !== 'offre:ir') return null
                return (
                  <tr key={k}>
                    <td>{(lEnd ?? l5).label}</td>
                    <td className="sb-num">{fmt(m5, 1, { signed: true })}</td>
                    <td className="sb-num">{fmt(mEnd, 1, { signed: true })}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th>Écart total (scénario − réf.)</th>
                <td className="sb-num">{fmt(decomposition.y5.ecart, 1, { signed: true })}</td>
                <td className="sb-num">{fmt(decomposition.end.ecart, 1, { signed: true })}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="sb-print-sec">
          <h2>4. Sous-secteurs APU ({subsectors.endYear})</h2>
          <table className="sb-print-table">
            <thead>
              <tr><th>Sous-secteur</th><th className="sb-num">Solde Md€</th><th className="sb-num">% PIB</th><th className="sb-num">Écart Md€</th></tr>
            </thead>
            <tbody>
              {subsectors.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td className="sb-num">{fmt(row.endBalance, 1)}</td>
                  <td className="sb-num">{fmt(row.endRatio, 2)} %</td>
                  <td className="sb-num">{fmt(row.endDelta, 1, { signed: true })}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total APU consolidé (S13)</th>
                <td className="sb-num">{fmt(subsectors.totalEnd.balance, 1)}</td>
                <td className="sb-num">{fmt(subsectors.totalEnd.ratio, 2)} %</td>
                <td className="sb-num">{fmt(subsectors.totalEnd.endDelta, 1, { signed: true })}</td>
              </tr>
            </tfoot>
          </table>
          {subsectors.incidence && (
            <p className="sb-print-incid">
              <strong>Payeurs 1er tour ({subsectors.incidence.year}) :</strong>{' '}
              {subsectors.incidence.payers
                .filter((g) => Math.abs(g.exAnte) >= 0.05)
                .map((g) => `${g.id} ${fmt(g.exAnte, 1, { signed: true })} Md€`)
                .join(' · ')}
            </p>
          )}
        </section>
      </div>

      <section className="sb-print-sec sb-print-params">
        <h2>5. Hypothèses clés et paramètres à vérifier</h2>
        <p className="sb-print-anchors">{assumptions.anchors.join(' · ')}</p>
        {assumptions.flaggedParams.length > 0 && (
          <p className="sb-print-flagged">
            <strong>Paramètres à statut provisoire ({assumptions.flaggedParams.length}) :</strong>{' '}
            {assumptions.flaggedParams.map((p) => `${p.id} = ${p.rangeText} [${p.status}]`).join(' · ')}
          </p>
        )}
      </section>
    </article>
  )
})

/** Bouton « Copier la note (Markdown) » avec retour aria-live et repli <textarea> en lecture seule. */
export function CopyBriefButton({ getMarkdown }) {
  const [status, setStatus] = useState({ kind: 'idle', md: '' })
  const areaRef = useRef(null)

  const copy = async () => {
    const md = getMarkdown()
    try {
      if (!navigator.clipboard?.writeText) throw new Error('presse-papiers indisponible')
      await navigator.clipboard.writeText(md)
      setStatus({ kind: 'ok', md })
    } catch {
      setStatus({ kind: 'manual', md })
      setTimeout(() => areaRef.current?.select(), 0)
    }
  }

  return (
    <div className="sb-brief-copy">
      <button type="button" className="sb-btn" onClick={copy}>Copier la note (Markdown)</button>
      <span role="status" aria-live="polite" className="sb-share-status">
        {status.kind === 'ok' && 'Note Markdown copiée.'}
        {status.kind === 'manual' && 'Copie automatique impossible : sélectionnez le texte ci-dessous (Ctrl+C).'}
      </span>
      {status.kind === 'manual' && (
        <textarea ref={areaRef} className="sb-share-url sb-brief-fallback" rows={4} readOnly value={status.md} aria-label="Note de synthèse Markdown" onFocus={(e) => e.target.select()} />
      )}
    </div>
  )
}
