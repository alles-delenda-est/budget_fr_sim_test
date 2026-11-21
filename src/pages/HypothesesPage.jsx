import { useState, useMemo } from 'react'
import { PARAMS, PARAM_BY_ID, resolveParams } from '../engine/params.js'
import { STRUCTURAL_LEVERS } from '../engine/levers.js'
import { issuanceRate } from '../engine/project.js'
import { WARNING_THRESHOLDS as W } from '../config.js'
import { fmt, FLAGGED_STATUSES } from './budget/helpers'
import { StatusBadge } from './budget/InfoPopover'
import {
  buildApu2025Accounts,
  buildCofogRows,
  buildEquations,
  buildLeverCatalog,
  lvtSupplyInfo,
  formatParamValue,
  groupParams,
  paramStatusCounts,
  REVIEWER_QUESTIONS,
} from './hypotheses/helpers'
import './SimulateurBudgetPage.css'
import './HypothesesPage.css'

const SECTIONS = [
  { id: 'hyp-comptes', label: 'Comptes 2025' },
  { id: 'hyp-equations', label: 'Équations E1–E12' },
  { id: 'hyp-leviers', label: 'Leviers & σ' },
  { id: 'hyp-parametres', label: 'Paramètres' },
  { id: 'hyp-questions', label: 'Questions aux relecteurs' },
]

export default function HypothesesPage() {
  const [flaggedOnly, setFlaggedOnly] = useState(false)

  const model = useMemo(() => {
    const P = resolveParams()
    return {
      P,
      apu: buildApu2025Accounts(P),
      cofog: buildCofogRows(P),
      equations: buildEquations(P),
      levers: buildLeverCatalog(P),
      lvt: lvtSupplyInfo(P),
      iStarPct: issuanceRate(P) * 100,
      counts: paramStatusCounts(PARAMS),
    }
  }, [])

  const paramGroups = useMemo(() => groupParams(PARAMS, { flaggedOnly }), [flaggedOnly])
  const { P, apu, cofog, equations, levers, lvt, iStarPct, counts } = model

  const jumpTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="hyp-page">
      <header className="hyp-header">
        <h1>Hypothèses et paramètres du moteur v2</h1>
        <p className="sb-help">
          Source unique de vérité : tous les chiffres, statuts et fourchettes de cette page sont lus directement dans le
          catalogue du moteur (<code>src/engine/params.js</code>, <code>levers.js</code>, <code>supply.js</code>,{' '}
          <code>config.js</code>). Les statuts à vérifier ({FLAGGED_STATUSES.join(', ')}) sont mis en évidence pour les
          relecteurs.
        </p>
        <nav className="hyp-toc" aria-label="Sections de la page Hypothèses">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className="hyp-toc-btn" onClick={() => jumpTo(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 1. COMPTES 2025 DES APU */}
      <section id="hyp-comptes" className="hyp-section">
        <h2>1. Comptes 2025 des administrations publiques (3 blocs consolidés)</h2>
        <p className="sb-help">
          Comptes provisoires 2025 en comptabilité nationale (Insee, solde et dette au sens de Maastricht). La somme des
          dépenses des trois blocs ({fmt(apu.nonConsolDepenses, 1)} Md€) dépasse le total consolidé (
          {fmt(P['base.depenses.apu'], 1)} Md€) de <strong>{fmt(apu.interBlockTransfers, 1)} Md€</strong> : ce sont les
          transferts entre blocs, éliminés par consolidation.
        </p>

        <div className="hyp-anchors">
          <div className="hyp-anchor-card">
            <span className="hyp-anchor-label">PIB 2025</span>
            <strong>{fmt(P['base.pib.2025'], 0)} Md€</strong>
          </div>
          <div className="hyp-anchor-card">
            <span className="hyp-anchor-label">Dette brute 2025</span>
            <strong>{fmt(P['base.dette.2025'], 1)} Md€</strong>
            <span className="hyp-anchor-sub">{fmt(P['base.dette.ratio_2025'], 1)} % du PIB</span>
          </div>
          <div className="hyp-anchor-card">
            <span className="hyp-anchor-label">Chômage (T3 2026)</span>
            <strong>{fmt(P['base.chomage'], 1)} %</strong>
          </div>
          <div className="hyp-anchor-card">
            <span className="hyp-anchor-label">Prélèvements obligatoires</span>
            <strong>{fmt(P['fisc.eps_offre'] * 100, 1)} % du PIB</strong>
          </div>
          <div className="hyp-anchor-card">
            <span className="hyp-anchor-label">Allocations Unédic 2025</span>
            <strong>{fmt(P['base.unedic.allocations'], 1)} Md€</strong>
          </div>
        </div>

        <div className="hyp-table-wrap">
          <table className="hyp-table">
            <thead>
              <tr>
                <th scope="col">Bloc (Md€ 2025)</th>
                <th scope="col" className="hyp-num">Recettes</th>
                <th scope="col" className="hyp-num">Dépenses</th>
                <th scope="col" className="hyp-num">Intérêts</th>
                <th scope="col" className="hyp-num">Solde</th>
                <th scope="col" className="hyp-num">Solde (% PIB)</th>
              </tr>
            </thead>
            <tbody>
              {apu.rows.map((r) => (
                <tr key={r.id} className={r.isTotal ? 'hyp-total-row' : ''}>
                  <th scope="row">{r.label}</th>
                  <td className="hyp-num">{fmt(r.recettes, 1)}</td>
                  <td className="hyp-num">{fmt(r.depenses, 1)}</td>
                  <td className="hyp-num">{fmt(r.interets, 1)}</td>
                  <td className="hyp-num">{fmt(r.solde, 1, { signed: true })}</td>
                  <td className="hyp-num">{fmt(r.soldeRatio, 2, { signed: true })} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Dépenses publiques par fonction (COFOG 2024 provisoire)</h3>
        <p className="sb-help">
          Source : Insee Première n° 2093 (les chiffres 2025 paraîtront en décembre 2026). Ces masses servent d'étalon aux
          leviers de dépense par fonction (1 % de la ligne).
        </p>
        <div className="hyp-table-wrap">
          <table className="hyp-table">
            <thead>
              <tr>
                <th scope="col">Fonction COFOG</th>
                <th scope="col">Identifiant</th>
                <th scope="col" className="hyp-num">Montant (Md€ 2024)</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {cofog.map((c) => (
                <tr key={c.id}>
                  <th scope="row">{c.label}</th>
                  <td><code>{c.id}</code></td>
                  <td className="hyp-num">{fmt(c.value, 0)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. ÉQUATIONS E1-E12 & SEUILS */}
      <section id="hyp-equations" className="hyp-section">
        <h2>2. Équations du moteur (E1–E12) et seuils d'avertissement</h2>
        <p className="sb-help">
          Indices : <code>t = 0</code> pour 2026 (année en cours, estimation), <code>t ≥ 1</code> à partir de 2027. Taux à
          l'émission de référence pondéré calculé : <strong>i* = {fmt(iStarPct, 2)} %</strong> (BTF{' '}
          {fmt(P['dette.part_btf'] * 100, 1)} % à {fmt(P['dette.y_btf'], 2)} %, OAT 2–8 ans{' '}
          {fmt(P['dette.part_moyen'] * 100, 1)} % à {fmt(P['dette.y_moyen'], 2)} %, OAT 10 ans+{' '}
          {fmt(P['dette.part_long'] * 100, 1)} % à {fmt(P['dette.y_long'], 2)} %).
        </p>
        <div className="hyp-table-wrap">
          <table className="hyp-table">
            <thead>
              <tr>
                <th scope="col">Éq.</th>
                <th scope="col">Mécanisme</th>
                <th scope="col">Formule</th>
                <th scope="col">Rôle dans le modèle</th>
              </tr>
            </thead>
            <tbody>
              {equations.map((eq) => (
                <tr key={eq.id}>
                  <th scope="row"><strong>{eq.id}</strong></th>
                  <td>{eq.titre}</td>
                  <td><code className="hyp-formula">{eq.formule}</code></td>
                  <td>{eq.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hyp-thresholds">
          <h3>Seuils d'avertissement « hors expérience historique » (<code>src/config.js</code>)</h3>
          <ul>
            <li>
              <strong>Palier 1 (vigilance) :</strong> dette brute supérieure à{' '}
              <strong>{W.tier1DebtPct} % du PIB</strong> — au-delà du record historique d'une économie avancée (Japon :{' '}
              {W.tier1ReferencePct} % en {W.tier1ReferenceYear}, FMI).
            </li>
            <li>
              <strong>Palier 2 (hors expérience) :</strong> dette brute supérieure à{' '}
              <strong>{W.tier2DebtPct} % du PIB</strong>, <em>ou</em> charge d'intérêts supérieure à{' '}
              <strong>{W.tier2InterestShareRevenuePct} % des recettes publiques</strong>, <em>ou</em> toute grandeur en %
              du PIB dépassant {W.tier2GdpFigurePct} %. Au-delà de ce point, les courbes sont grisées et pointillées.
            </li>
          </ul>
        </div>
      </section>

      {/* 3. CATALOGUE DES LEVIERS ET EFFETS D'OFFRE */}
      <section id="hyp-leviers" className="hyp-section">
        <h2>3. Catalogue des leviers et effets d'offre (σ)</h2>
        <p className="sb-help">
          Les effets d'offre <code>σ</code> des impôts (cotisations, CSG, TVA, IR, IS) sont <strong>calculés</strong> dans{' '}
          <code>supply.js</code> à partir de <code>offre.e_L</code> ({fmt(P['offre.e_L'], 2)}) et du coût d'usage du capital
          (IS). Ceux de l'âge légal, de l'assurance chômage et de l'enseignement sont <strong>décidés</strong> d'après la
          revue de preuves.
        </p>
        <div className="hyp-table-wrap">
          <table className="hyp-table">
            <thead>
              <tr>
                <th scope="col">Levier</th>
                <th scope="col">Unité (bornes)</th>
                <th scope="col" className="hyp-num">Étalon (+1 u.)</th>
                <th scope="col">Bloc(s) et rampe</th>
                <th scope="col">Effet d'offre σ (% PIB / u.)</th>
                <th scope="col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {levers.map((l) => (
                <tr key={l.id}>
                  <th scope="row">
                    <div>{l.titre}</div>
                    <code className="hyp-id">{l.id}</code>
                  </th>
                  <td>{l.unite} ({fmt(l.min, 0)} à {fmt(l.max, 0, { signed: true })})</td>
                  <td className="hyp-num">{fmt(l.unitYield, 2, { signed: true })} Md€</td>
                  <td>
                    <div>{l.blocsLabel}</div>
                    <div className="hyp-sub">{l.rampText}</div>
                  </td>
                  <td>
                    {l.supply ? (
                      <>
                        <div>
                          <strong>{fmt(l.supply.central, 3, { signed: true })} %</strong>{' '}
                          <span className="hyp-sub">
                            (bas {fmt(l.supply.low, 3, { signed: true })} / haut {fmt(l.supply.high, 3, { signed: true })})
                          </span>
                        </div>
                        <div className="hyp-sub">
                          σ {l.supply.mode} · L = {fmt(l.supply.L, 0)} ans{l.supply.t0 > 0 ? `, t0 = ${fmt(l.supply.t0, 0)} ans` : ''}
                        </div>
                        {l.supply.statut === 'non validé' && (
                          <div className="hyp-flag-note"><StatusBadge status="non validé" /> avis demandé</div>
                        )}
                      </>
                    ) : (
                      <span className="hyp-sub">σ = 0 (aucun effet d'offre)</span>
                    )}
                  </td>
                  <td><StatusBadge status={l.statut} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hyp-subgrid">
          <div className="hyp-note-card">
            <h3>Module Taxe sur la valeur du sol (LVT) — paramètre σ décidé</h3>
            <p>
              <code>{lvt.id}</code> : <strong>{fmt(lvt.central, 2, { signed: true })} %</strong> du PIB (bas{' '}
              {fmt(lvt.low, 2, { signed: true })} / haut {fmt(lvt.high, 2, { signed: true })}, L = {fmt(lvt.L, 0)} ans, t0 ={' '}
              {fmt(lvt.t0, 0)} an) <StatusBadge status={lvt.status} />. Remplacement intégral de la taxe foncière hors DMTO
              (module non encore branché en levier natif).
            </p>
          </div>
          <div className="hyp-note-card">
            <h3>Réformes structurelles désactivées (σ = 0)</h3>
            <ul>
              {STRUCTURAL_LEVERS.map((s) => (
                <li key={s.id}>
                  <strong>{s.titre}</strong> (<code>{s.id}</code>) — <StatusBadge status={s.statut} /> : avis demandé, aucun
                  effet budgétaire à ce stade.
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 4. TABLE COMPLÈTE DES PARAMÈTRES */}
      <section id="hyp-parametres" className="hyp-section">
        <h2>4. Table complète des paramètres du moteur ({counts.total})</h2>
        <p className="sb-help">
          <strong>{counts.sourced}</strong> paramètres sourcés (dont fourchettes sourcées et sources secondaires) ;{' '}
          <strong>{counts.flagged}</strong> paramètres portant un statut à vérifier ({FLAGGED_STATUSES.join(', ')}).
        </p>

        <div className="hyp-filter-bar" role="group" aria-label="Filtrer les paramètres par statut">
          <button
            type="button"
            className={`sb-btn ${!flaggedOnly ? 'hyp-btn-active' : ''}`}
            aria-pressed={!flaggedOnly}
            onClick={() => setFlaggedOnly(false)}
          >
            Tous les paramètres ({counts.total})
          </button>
          <button
            type="button"
            className={`sb-btn ${flaggedOnly ? 'hyp-btn-active' : ''}`}
            aria-pressed={flaggedOnly}
            onClick={() => setFlaggedOnly(true)}
          >
            À vérifier uniquement ({counts.flagged})
          </button>
        </div>

        {paramGroups.map((g) => (
          <div key={g.id} className="hyp-param-group">
            <h3>
              {g.titre} <span className="sb-muted">({g.items.length})</span>
            </h3>
            <div className="hyp-table-wrap">
              <table className="hyp-table hyp-param-table">
                <thead>
                  <tr>
                    <th scope="col">Identifiant</th>
                    <th scope="col">Valeur centrale et fourchette</th>
                    <th scope="col">Statut</th>
                    <th scope="col">Source et explication</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((q) => (
                    <tr key={q.id}>
                      <th scope="row"><code className="hyp-id">{q.id}</code></th>
                      <td className="hyp-val-col">{formatParamValue(q)}</td>
                      <td><StatusBadge status={q.status} /></td>
                      <td>
                        <div className="hyp-explain">{q.explanation}</div>
                        <div className="hyp-source"><strong>Source :</strong> {q.source ?? 'non renseignée'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      {/* 5. QUESTIONS OUVERTES AUX RELECTEURS */}
      <section id="hyp-questions" className="hyp-section">
        <h2>5. Questions ouvertes aux relecteurs (<code>docs/model-note.md</code> §12)</h2>
        <p className="sb-help">
          Trois choix de modélisation sont explicitement soumis à l'avis des économistes relecteurs avant la publication :
        </p>
        <div className="hyp-questions">
          {REVIEWER_QUESTIONS.map((q) => (
            <article key={q.numero} className="hyp-question-card">
              <h3>{q.numero}. {q.titre}</h3>
              <p>{q.resume}</p>
              <p className="hyp-question-status">{q.statut}</p>
            </article>
          ))}
        </div>
        <p className="sb-help hyp-footnote">
          Référence complète : <code>docs/model-note.md</code> (note de modèle v0.3) et <code>src/engine/params.js</code>{' '}
          (catalogue des {Object.keys(PARAM_BY_ID).length} paramètres).
        </p>
      </section>
    </div>
  )
}
