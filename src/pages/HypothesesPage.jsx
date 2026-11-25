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
  buildReviewerQuestions,
  buildInternalDerivations,
} from './hypotheses/helpers'
import './SimulateurBudgetPage.css'
import './HypothesesPage.css'

const SECTIONS = [
  { id: 'hyp-comptes', label: 'Comptes 2025' },
  { id: 'hyp-equations', label: 'Équations E1–E12' },
  { id: 'hyp-leviers', label: 'Leviers & σ' },
  { id: 'hyp-parametres', label: 'Paramètres' },
  { id: 'hyp-methodo-avancee', label: 'Méthodologie avancée' },
  { id: 'hyp-questions', label: 'Questions aux relecteurs' },
]

export default function HypothesesPage() {
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
      questions: buildReviewerQuestions(),
      derivations: buildInternalDerivations(P),
    }
  }, [])

  const paramGroups = useMemo(() => groupParams(PARAMS, { flaggedOnly }), [flaggedOnly])
  const { P, apu, cofog, equations, levers, lvt, iStarPct, counts, questions, derivations } = model

  const jumpTo = (id) => {
    if (id === 'hyp-methodo-avancee' && !showAdvanced) {
      setShowAdvanced(true)
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
      return
    }
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
              Ces seuils sont une <strong>convention du simulateur</strong>, sans source empirique :{' '}
              {fmt(W.tier2DebtPct / 100, 0)} fois le PIB est choisi très au-delà de tout cas enregistré (le palier 1
              repose, lui, sur le record observé du Japon) ; la part de {W.tier2InterestShareRevenuePct} % des recettes est
              un repère lisible, non un seuil estimé.
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
                  <td className="hyp-num">
                    <div>{fmt(l.unitYield, 2, { signed: true })} Md€</div>
                    {l.unitYieldDown !== null && (
                      <div className="hyp-sub">−1 u. : {fmt(l.unitYieldDown, 2, { signed: true })} Md€</div>
                    )}
                  </td>
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
              (paramètre non lu par le module minimal de la page Budget, qui applique D2 : effet d'offre central nul, borne de
              l'OCDE en cas haut sur option ; écart à trancher).
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

      {/* 4bis. VUE AVANCÉE — MÉTHODOLOGIE DES DÉRIVATIONS INTERNES */}
      <section id="hyp-methodo-avancee" className="hyp-section hyp-advanced-section">
        <div className="hyp-advanced-bar">
          <div>
            <h2>Vue avancée — Méthodologie des dérivations internes</h2>
            <p className="sb-help hyp-advanced-lead">
              Repliée par défaut pour alléger la lecture : détail des calculs internes retenus pour{' '}
              <code>ref.derive.b_autres</code>, <code>dem.m.prestations</code>, la provenance LVTShift de{' '}
              <code>lvt.capi.part</code> et, pour mémoire, la dérivation par tranche de l'IR.
            </p>
          </div>
          <button
            type="button"
            className={`sb-btn hyp-advanced-toggle ${showAdvanced ? 'hyp-btn-active' : ''}`}
            aria-expanded={showAdvanced}
            aria-controls={showAdvanced ? 'hyp-advanced-panel' : undefined}
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? 'Masquer la méthodologie avancée ' : 'Afficher la méthodologie avancée '}
            <span aria-hidden="true">{showAdvanced ? '▴' : '▾'}</span>
          </button>
        </div>

        {showAdvanced && (
          <div id="hyp-advanced-panel" className="hyp-advanced-panel">
            {/* A. ref.derive.b_autres */}
            <article className="hyp-method-card">
              <div className="hyp-method-head">
                <h3>
                  A. Dérive primaire hors vieillissement (<code>ref.derive.b_autres</code>) :{' '}
                  <strong>{fmt(derivations.bAutres.param.value, 2, { signed: true })} pt de PIB/an</strong>
                </h3>
                <StatusBadge status={derivations.bAutres.param.status} />
              </div>
              <p>
                <strong>Périmètre (zéro double compte) :</strong> séries officielles Eurostat 1995–2024 (France S13,{' '}
                <code>gov_10a_exp</code>, <code>gov_10a_main</code>, <code>nama_10_gdp</code>), dépense primaire hors
                vieillissement <code>TOTAL − D41PAY − GF07 (santé) − GF1002 (vieillesse)</code> ={' '}
                <strong>{fmt(derivations.bAutres.share2024Pct, 2)} % du PIB</strong> en 2024. Retirer{' '}
                <code>GF07</code> et <code>GF1002</code> exclut déjà la santé et les soins de longue durée liés au grand
                âge : aucun double comptage avec <code>ref.derive.a_sante</code>, même sur sa borne haute.
              </p>
              <p>
                <strong>Règle D7 :</strong> pour chaque fenêtre structurelle (hors points Covid 2020–2021 aux bornes), la
                dérive annuelle implicite face à la croissance potentielle{' '}
                <code>g_pot = {fmt(derivations.bAutres.gPotPct, 1)} %</code> vaut{' '}
                <code className="hyp-formula">
                  b = max(0 ; {fmt(derivations.bAutres.share2024Pct, 2)} % × (g_dép − {fmt(derivations.bAutres.gPotPct, 1)} %))
                </code>
                . La valeur interne retenue est la <strong>médiane des {derivations.bAutres.windows.length} fenêtres</strong> (
                <strong>
                  {fmt(derivations.bAutres.rawMedian, 3, { signed: true })} →{' '}
                  {fmt(derivations.bAutres.rounded, 2, { signed: true })} pt/an
                </strong>
                ), qui coïncide avec la fenêtre post-crise <strong>2007–2024</strong> (seule fenêtre où la croissance réelle
                observée du PIB, {fmt(derivations.bAutres.window2007?.gGdpPct, 2, { signed: true })} %/an, rejoint{' '}
                <code>g_pot</code>) et avec la pente MCO 2000–2024 hors Covid en part de PIB (
                {fmt(derivations.bAutres.ols2000ExCovid, 3, { signed: true })} pt/an).
              </p>
              <div className="hyp-table-wrap">
                <table className="hyp-table">
                  <thead>
                    <tr>
                      <th scope="col">Fenêtre Eurostat</th>
                      <th scope="col" className="hyp-num">Croiss. réelle dép.</th>
                      <th scope="col" className="hyp-num">Croiss. réelle PIB</th>
                      <th scope="col" className="hyp-num">Dérive obs. (% PIB/an)</th>
                      <th scope="col" className="hyp-num">Dérive D7 face à g_pot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derivations.bAutres.windows.map((w) => (
                      <tr key={w.id} className={w.id === '2007-2024' ? 'hyp-total-row' : ''}>
                        <th scope="row">{w.label}</th>
                        <td className="hyp-num">{fmt(w.gDepPct, 2, { signed: true })} %</td>
                        <td className="hyp-num">{fmt(w.gGdpPct, 2, { signed: true })} %</td>
                        <td className="hyp-num">{fmt(w.obsDriftPp, 3, { signed: true })} pt</td>
                        <td className="hyp-num">
                          <strong>{fmt(w.impliedD7, 3, { signed: true })} pt</strong>
                          {w.impliedRaw < 0 ? ` (brut ${fmt(w.impliedRaw, 3)})` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="sb-help">
                <strong>Sensibilité sur la référence {derivations.bAutres.endYear10} (recalculée par le moteur) :</strong>{' '}
                {derivations.bAutres.debt2036Sensitivity
                  .map((s) => `à b = ${fmt(s.b, 2)} pt/an → dette ${fmt(s.debt2036Pct, 1)} % (solde ${fmt(s.balance2036Pct, 2, { signed: true })} %)`)
                  .join(' · ')}
                .
              </p>
            </article>

            {/* B. dem.m.prestations */}
            <article className="hyp-method-card">
              <div className="hyp-method-head">
                <h3>
                  B. Multiplicateur des prestations sociales (<code>dem.m.prestations</code>) :{' '}
                  <strong>{fmt(derivations.mPrestations.param.value, 2)}</strong> (fourchette{' '}
                  {fmt(derivations.mPrestations.param.low, 1)}–{fmt(derivations.mPrestations.param.high, 1)})
                </h3>
                <StatusBadge status={derivations.mPrestations.param.status} />
              </div>
              <p>
                <strong>Pourquoi un calcul interne :</strong> le modèle <em>Mésange</em> (Insee / DG Trésor, G2017/04) ne
                publie aucune variante « prestations seules » (les prestations en espèces forment{' '}
                {fmt((derivations.mPrestations.mesange?.prestWeight ?? Number.NaN) * 100, 0)} % du choc composite de dépense
                §4.1.2). La seule estimation française directe lue est la variante prestations sociales hors chômage de{' '}
                <strong>FR-BDF</strong> (Banque de France, WP 750, Tableau 11 p. 28) :{' '}
                <code>{derivations.mPrestations.profile.map((v) => fmt(v, 2, { signed: true })).join(' / ')} %</code> de PIB
                sur {derivations.mPrestations.profile.length} ans (cumul{' '}
                <strong>{fmt(derivations.mPrestations.cum4, 2)}</strong>).
              </p>
              <p>
                <strong>Méthode retenue (équivalence cumulée dans E4) :</strong> l'équation E4 applique un pic dès l'année 1
                puis décroît géométriquement au rythme <code>λ = {fmt(derivations.mPrestations.lambda, 1)}</code> (facteur
                cumulé sur 4 ans{' '}
                <code className="hyp-formula">
                  1 + λ + λ² + λ³ = {fmt(derivations.mPrestations.e4Factor4, 3)}
                </code>
                ). Retenir la seule année 1 de FR-BDF ({fmt(derivations.mPrestations.profile[0], 2)}) écraserait l'impulsion
                cumulée d'un modèle en cloche. Le multiplicateur équivalent qui reproduit la même impulsion cumulée sur 4 ans
                vaut{' '}
                <code className="hyp-formula">
                  {fmt(derivations.mPrestations.cum4, 2)} / {fmt(derivations.mPrestations.e4Factor4, 3)} ={' '}
                  {fmt(derivations.mPrestations.frBdfEq4, 3)} → {fmt(derivations.mPrestations.rounded, 2)}
                </code>
                .
              </p>
              <div className="hyp-table-wrap">
                <table className="hyp-table">
                  <thead>
                    <tr>
                      <th scope="col">Proxy / recoupement</th>
                      <th scope="col">Mode de lecture &amp; calcul</th>
                      <th scope="col" className="hyp-num">Valeur</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hyp-total-row">
                      <th scope="row">FR-BDF (WP 750, Tab. 11) — équivalent E4 sur 4 ans (retenu)</th>
                      <td>Lecture directe PDF · cumul 4 ans ({fmt(derivations.mPrestations.cum4, 2)}) ÷ {fmt(derivations.mPrestations.e4Factor4, 3)}</td>
                      <td className="hyp-num"><strong>{fmt(derivations.mPrestations.frBdfEq4, 3)} → {fmt(derivations.mPrestations.rounded, 2)}</strong></td>
                    </tr>
                    <tr>
                      <th scope="row">FR-BDF — équivalent E4 sur 2 ans (contrôle borne basse)</th>
                      <td>Lecture directe PDF · cumul 2 ans ({fmt(derivations.mPrestations.cum2, 2)}) ÷ {fmt(derivations.mPrestations.e4Factor2, 2)}</td>
                      <td className="hyp-num">{fmt(derivations.mPrestations.frBdfEq2, 3)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Mésange G2017/04 — proxy revenu disponible (IR/CSG §§4.1.6–4.1.7)</th>
                      <td>Lecture directe PDF · plancher bas (propension à consommer ≥ contribuables IR/CSG)</td>
                      <td className="hyp-num">{fmt(derivations.mPrestations.mesangeIrCsgY1, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Mésange G2017/04 — résidu algébrique du choc composite (§4.1.2)</th>
                      <td>
                        Lecture directe PDF · {fmt(derivations.mPrestations.mesange?.compositeY1, 2)} ={' '}
                        {fmt((derivations.mPrestations.mesange?.investWeight ?? Number.NaN) * 100, 0)} %×
                        {fmt(derivations.mPrestations.mesange?.investY1, 2)} +{' '}
                        {fmt((derivations.mPrestations.mesange?.remWeight ?? Number.NaN) * 100, 0)} %×m_rém +{' '}
                        {fmt((derivations.mPrestations.mesange?.achatsWeight ?? Number.NaN) * 100, 0)} %×m_achats +{' '}
                        {fmt((derivations.mPrestations.mesange?.prestWeight ?? Number.NaN) * 100, 0)} %×m_prest (m_direct =
                        1,0 vs moteur {fmt(derivations.mPrestations.mRem, 1)}/{fmt(derivations.mPrestations.mAchats, 1)})
                      </td>
                      <td className="hyp-num">{fmt(derivations.mPrestations.mesangeResidualUnit, 2)} à {fmt(derivations.mPrestations.mesangeResidualEngine, 2)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Coenen et al. (2012, AEJ: Macro) — transferts généraux an 1</th>
                      <td>Secondaire (non relu dans le PDF primaire, valeurs en graphiques)</td>
                      <td className="hyp-num">{fmt(derivations.mPrestations.coenenSecondary, 2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </article>

            {/* C. lvt.capi.part */}
            <article className="hyp-method-card">
              <div className="hyp-method-head">
                <h3>
                  C. Capitalisation du module LVT (<code>lvt.capi.part</code>) :{' '}
                  <strong>{fmt(derivations.lvtCapi.param.value, 2)}</strong> (fourchette{' '}
                  {fmt(derivations.lvtCapi.param.low, 2)}–{fmt(derivations.lvtCapi.param.high, 2)})
                </h3>
                <StatusBadge status={derivations.lvtCapi.param.status} />
              </div>
              <p>
                <strong>Vérification d'héritage depuis <code>alles-delenda-est/LVTShift</code> :</strong> l'import épinglé{' '}
                <code>yields.json</code> (commit <code>{derivations.lvtCapi.provenance.commit}</code>, <code>as_of</code>{' '}
                {derivations.lvtCapi.provenance.asOf}) fournit les rendements des impôts remplacés et l'assiette foncière (
                <code>lvt.base_fonciere.2025</code>), mais <strong>n'exporte aucun paramètre de capitalisation</strong>{' '}
                (LVTShift est un modèle statique de répartition à produit constant ; aucun héritage automatique n'est donc
                possible). La note de recherche <code>lvtshift-fr/docs/research/dynamic-effects.md</code> (§5.4, lue
                directement) recommande en prose <strong>100 %</strong> en central et <strong>60 %</strong> en sensibilité
                (Palmon &amp; Smith 1998 : 62 % ; Høj et al. 2018 : capitalisation complète au Danemark).
              </p>
              <p>
                <strong>Valeur retenue dans le module (D12, capitalisation nette) :</strong> milieu de la fourchette{' '}
                <strong>{fmt(derivations.lvtCapi.param.value, 2)}</strong>, appliqué symétriquement à la nouvelle taxe
                nationale et aux impôts nationaux supprimés (taux réel{' '}
                <code>{fmt(derivations.lvtCapi.tauxParam.value, 1)} %</code>, part du sol{' '}
                <code>{fmt(derivations.lvtCapi.partSolParam.value * 100, 1)} %</code> Insee 2025), soit une part effective
                nette de{' '}
                <code className="hyp-formula">
                  {fmt(derivations.lvtCapi.param.value, 2)} × (1 − {fmt(derivations.lvtCapi.partSolParam.value, 3)}) ≈{' '}
                  {fmt(derivations.lvtCapi.effectiveNetShare * 100, 1)} %
                </code>{' '}
                sur les scénarios S2 et S3 (plancher à 0, aucun effet en S1).
              </p>
              <div className="hyp-table-wrap">
                <table className="hyp-table">
                  <thead>
                    <tr>
                      <th scope="col">Scénario LVT</th>
                      <th scope="col" className="hyp-num">Produit total (Md€)</th>
                      <th scope="col" className="hyp-num">Part nat. add. (Md€)</th>
                      <th scope="col" className="hyp-num">Capi. brute (% PIB)</th>
                      <th scope="col" className="hyp-num">Capi. inverse (% PIB)</th>
                      <th scope="col" className="hyp-num">Effet net D12 (% PIB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derivations.lvtCapi.scenarios.map((s) => (
                      <tr key={s.id}>
                        <th scope="row">{s.id}</th>
                        <td className="hyp-num">{fmt(s.totalMd, 1)}</td>
                        <td className="hyp-num">{fmt(s.nationalAddMd, 1)}</td>
                        <td className="hyp-num">{fmt(s.capiBrutePct, 3, { signed: true })} %</td>
                        <td className="hyp-num">{fmt(s.capiInversePct, 3, { signed: true })} %</td>
                        <td className="hyp-num"><strong>{fmt(s.netPct, 3, { signed: true })} %</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {/* D. Pour mémoire : IR par tranche */}
            <article className="hyp-method-card">
              <div className="hyp-method-head">
                <h3>
                  D. Pour mémoire — Barème de l'IR par tranche (<code>src/engine/ir-tranches.js</code>)
                </h3>
                <StatusBadge status={derivations.irTranches.paramTheta.status} />
              </div>
              <p>
                Les revenus par tranche (total imposable + non imposé :{' '}
                <strong>{fmt(derivations.irTranches.totalRevenu, 1)} Md€</strong>) sont estimés par inversion du barème sur
                les effectifs et impôts nets DGFiP (revenus 2024), avec coin marginal complet (IR ×{' '}
                {fmt(derivations.irTranches.facteurCsg, 3)} + CSG/CRDS {fmt(derivations.irTranches.csgCrdsPct, 1)} % + CEHR
                en tranche {fmt(derivations.irTranches.topTranchePct, 0)} %). Ce socle commun produit{' '}
                <strong>θ proportionnel = {fmt(derivations.irTranches.thetaProp, 3)}</strong> (arrondi à{' '}
                <strong>{fmt(derivations.irTranches.paramTheta.value, 2)}</strong> ; +1 pt sur chaque taux :{' '}
                {fmt(derivations.irTranches.thetaPoint, 3)}) ainsi que l'effet d'offre σ de l'IR (voir{' '}
                <code>docs/review-day0-parameters.md</code> §9).
              </p>
            </article>
          </div>
        )}
      </section>

      {/* 5. QUESTIONS OUVERTES AUX RELECTEURS */}
      <section id="hyp-questions" className="hyp-section">
        <h2>5. Questions ouvertes aux relecteurs (<code>docs/model-note.md</code> §12)</h2>
        <p className="sb-help">
          Quatre choix de modélisation sont explicitement soumis à l'avis des économistes relecteurs avant la publication :
        </p>
        <div className="hyp-questions">
          {questions.map((q) => (
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
