import { memo } from 'react'
import { fmt } from './helpers'
import { InfoPopover } from './InfoPopover'

const pctShare = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${fmt(v, 1)} %` : '—')

export const IncidencePanel = memo(function IncidencePanel({ incidence, year }) {
  if (!incidence) return null
  const { hasActivity, isMixedSign, grossPos, grossNeg, totalExAnte, totalExPost, totalGdpPct, pillars, payers, lvtShift, benchmarks, stageB } = incidence
  const yr = incidence.year ?? year

  return (
    <section className="sb-section sb-incidence" aria-labelledby="sb-incidence-title">
      <h2 id="sb-incidence-title">
        Composition et incidence statutaire (« Qui paie ? ») <span className="sb-muted">({yr})</span>
      </h2>
      <p className="sb-help">
        Ventilation comptable de premier tour des mesures actives l&apos;année sélectionnée : 100 % du solde ex ante
        (et net APU après θ / reports sociaux) est affecté aux grandes masses budgétaires et aux payeurs statutaires initiaux.{' '}
        <strong>Signe positif (+)</strong> = ponction ou économie qui améliore le solde ;{' '}
        <strong>signe négatif (−)</strong> = baisse de prélèvement ou dépense nouvelle.
      </p>

      {!hasActivity ? (
        <p className="sb-empty">
          Aucune mesure active en {yr} (ou mesure pas encore entrée en vigueur) : l&apos;ajustement vs référence est nul.
        </p>
      ) : (
        <>
          {/* Vue A1 : Macro-composition en 3 piliers */}
          <div className="sb-incid-pillars" role="group" aria-label="Grandes masses de l'ajustement">
            {pillars.map((p) => {
              const toneClass = p.exAnte > 0.05 ? 'sb-incid-pos' : p.exAnte < -0.05 ? 'sb-incid-neg' : 'sb-incid-zero'
              const pre = p.id === 'prestations_sante'
              return (
                <div key={p.id} className="sb-incid-pillar">
                  <div className="sb-incid-pillar-head">
                    <span className="sb-incid-pillar-title">{p.titre}</span>
                    <InfoPopover label={p.titre}>
                      <span className="sb-info-line">{p.description}</span>
                    </InfoPopover>
                  </div>
                  <div className={`sb-incid-pillar-val ${toneClass}`}>
                    {fmt(p.exAnte, 1, { signed: true })} Md€
                    {p.sharePct !== null && <span className="sb-incid-share"> ({pctShare(p.sharePct)})</span>}
                  </div>
                  <div className="sb-incid-bar-track" aria-hidden="true">
                    <div className={`sb-incid-bar-fill ${toneClass}`} style={{ width: `${Math.round(p.barPct)}%` }} />
                  </div>
                  <div className="sb-incid-pillar-sub">
                    Net APU : {fmt(p.exPost, 1, { signed: true })} Md€ · {fmt(p.gdpPct, 2, { signed: true })} % PIB
                    {pre && (Math.abs(p.especesExAnte) > 0.05 || Math.abs(p.santeExAnte) > 0.05) && (
                      <span className="sb-incid-subsplit">
                        dont espèces : {fmt(p.especesExAnte, 1, { signed: true })} Md€ · ONDAM : {fmt(p.santeExAnte, 1, { signed: true })} Md€
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {isMixedSign && (
            <p className="sb-incid-mixed-note" role="note">
              <strong>Paquet mixte / bascule fiscale :</strong> mesures de redressement (<strong>{fmt(grossPos, 1, { signed: true })} Md€</strong>)
              et allègements ou moyens nouveaux (<strong>{fmt(grossNeg, 1, { signed: true })} Md€</strong>), soit un effet direct net de{' '}
              <strong>{fmt(totalExAnte, 1, { signed: true })} Md€</strong> ({fmt(totalGdpPct, 2, { signed: true })} % du PIB). Les parts en % sont omises pour éviter toute division par un solde net proche de zéro.
            </p>
          )}

          {/* Vue A2 : Répartition par payeur statutaire initial G1–G5 */}
          <h3 className="sb-incid-subhead">Payeur statutaire initial vs incidence économique (1er tour)</h3>
          <p className="sb-help">
            Distinction entre <em>effort brut ex ante</em> (ponction ou économie légale) et <em>effet net APU</em> (après θ ou reports).
            Les impôts réagissent par érosion d&apos;assiette (qui ne rend pas de pouvoir d&apos;achat au contribuable), alors que les retours sur pensions amortissent partiellement la baisse pour les retraités.
          </p>

          <table className="sb-table sb-incid-table">
            <caption className="visually-hidden">Répartition par groupe payeur statutaire en {yr}</caption>
            <thead>
              <tr>
                <th scope="col">Groupe statutaire</th>
                <th scope="col" className="sb-num">Ex ante (Md€)</th>
                <th scope="col" className="sb-num">Net APU (Md€)</th>
              </tr>
            </thead>
            <tbody>
              {payers.map((g) => {
                const zero = Math.abs(g.exAnte) < 0.05 && Math.abs(g.exPost) < 0.05
                const toneClass = g.exAnte > 0.05 ? 'sb-incid-pos' : g.exAnte < -0.05 ? 'sb-incid-neg' : 'sb-incid-zero'
                return (
                  <tr key={g.id} className={zero ? 'sb-incid-row-muted' : undefined}>
                    <th scope="row">
                      <div className="sb-incid-row-title">
                        <span><strong>{g.id}</strong> — {g.titre}</span>
                        <InfoPopover label={`${g.id} — ${g.titre}`}>
                          <span className="sb-info-line">{g.sousTitre}</span>
                          <span className="sb-info-line">{g.note}</span>
                        </InfoPopover>
                      </div>
                      <div className="sb-incid-row-sub">{g.sousTitre}</div>
                      {!zero && (
                        <div className="sb-incid-bar-track sb-incid-bar-inline" aria-hidden="true">
                          <div className={`sb-incid-bar-fill ${toneClass}`} style={{ width: `${Math.round(g.barPct)}%` }} />
                        </div>
                      )}
                    </th>
                    <td className="sb-num">{fmt(g.exAnte, 1, { signed: true })}</td>
                    <td className="sb-num">{fmt(g.exPost, 1, { signed: true })}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total des mesures actives ({fmt(totalGdpPct, 2, { signed: true })} % PIB ex ante)</th>
                <td className="sb-num">{fmt(totalExAnte, 1, { signed: true })}</td>
                <td className="sb-num">{fmt(totalExPost, 1, { signed: true })}</td>
              </tr>
            </tfoot>
          </table>

          {lvtShift && (
            <div className="sb-incid-lvt-box" role="note">
              <strong>Module foncier ({lvtShift.scenarioLabel}) — bascule sectorielle brute :</strong>{' '}
              assiette foncière répartie à {fmt(lvtShift.householdsSharePct, 1)} % ménages /{' '}
              <strong>{fmt(lvtShift.companiesSharePct, 1)} % sociétés</strong> (Insee 2025).
              {Math.abs(lvtShift.companyShiftMd) > 0.05
                ? ` Déplacement brut de prélèvement des ménages (G3) vers le foncier des sociétés (G4) : +${fmt(lvtShift.companyShiftMd, 2)} Md€/an (en plus de la perte nette de capitalisation D12 de ${fmt(lvtShift.netCapiLossMd, 1, { signed: true })} Md€).`
                : ' En S1, échange interne aux impôts fonciers et DMTO (bascule brute ménages ↔ sociétés nulle au total).'}
            </div>
          )}

          {/* Vue A3 : Ordres de grandeur moyens & contrat Stage B */}
          <details className="sb-module-details">
            <summary>Ordres de grandeur moyens (dénominateurs sourcés) et microsimulation ménages</summary>
            {benchmarks.length > 0 && (
              <ul className="sb-incid-bench-list">
                {benchmarks.map((b) => (
                  <li key={b.id}>
                    <strong>{b.label} :</strong> {fmt(b.valueEur, 0, { signed: true })} {b.unit}
                    {Number.isFinite(b.secondaryEur) && ` (${fmt(b.secondaryEur, 0, { signed: true })} €/foyer déclaré/an)`}
                    <span className="sb-incid-bench-caveat"> — {b.caveat}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="sb-help">
              {stageB?.available
                ? 'Instantané de microsimulation ménages (policyengine-fr) chargé.'
                : 'Ventilation par décile de niveau de vie (D1–D10), taux de pauvreté, indice de Gini et cas-types (policyengine-fr) : prévue à l\'étape suivante via instantané JSON pondéré (docs/policyengine-fr-linkage.md), évitant toute extrapolation avant calibrage ERFS/DGFiP/CCSS.'}
            </p>
          </details>
        </>
      )}
    </section>
  )
})

export default IncidencePanel
