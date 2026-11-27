import { memo } from 'react'
import { PARAM_BY_ID } from '../../engine/params.js'
import { fmt, deltaTone, visibleLines, HIDE_BELOW, debtMovesAgainstBalance, YEAR1_PARADOX_TEXT } from './helpers'
import { betaRegimeText, tier1Text, tier2Text, tier2Explanation } from './warnings'
import { InfoPopover, StatusBadge, ParamInfo } from './InfoPopover'

function Delta({ value, unit, lowerIsBetter }) {
  const tone = deltaTone(value, lowerIsBetter)
  return <span className={`sb-delta sb-delta-${tone}`}>{fmt(value, 1, { signed: true })} {unit} vs réf.</span>
}

/** Bandeau au-dessus des résultats : indicateur β hors échantillon (> 180 % PIB), palier 1 (> 260 %) et/ou palier 2 (hors de toute expérience). */
export function WarningBanner({ warnings }) {
  if (!warnings?.betaRegime && !warnings?.tier1 && !warnings?.tier2) return null
  return (
    <div className="sb-warnings">
      {warnings.tier2 && <p className="sb-warning sb-warning-2" role="alert"><strong>Attention.</strong> {tier2Text(warnings.tier2)} <span className="sb-warning-why">{tier2Explanation()}</span></p>}
      {warnings.tier1 && <p className="sb-warning sb-warning-1" role="status">{tier1Text(warnings.tier1)}</p>}
      {warnings.betaRegime && !warnings.tier2 && <p className="sb-warning sb-warning-info" role="status">{betaRegimeText(warnings.betaRegime)}</p>}
    </div>
  )
}

function SnapshotCard({ titre, snap, explainParadox = false }) {
  return (
    <div className="sb-snap">
      <h3>{titre} <span className="sb-muted">({snap.year})</span></h3>
      <dl>
        <div><dt>Dette</dt><dd><strong>{fmt(snap.debtRatio, 1)} % du PIB</strong><Delta value={snap.debtDelta} unit="pt" lowerIsBetter /></dd></div>
        <div><dt>Solde</dt><dd><strong>{fmt(snap.balanceRatio, 2)} % du PIB</strong><Delta value={snap.balanceDelta} unit="pt" lowerIsBetter={false} /></dd></div>
        <div><dt>Intérêts</dt><dd><strong>{fmt(snap.interest, 1)} Md€</strong> <span className="sb-muted">({fmt(snap.interestRatio, 2)} % du PIB)</span><Delta value={snap.interestDelta} unit="Md€" lowerIsBetter /></dd></div>
      </dl>
      {explainParadox && debtMovesAgainstBalance(snap) && <p className="sb-snap-note">{YEAR1_PARADOX_TEXT}</p>}
    </div>
  )
}

function milestoneTone(status) {
  if (status === 'sustained') return 'sb-target-ok'
  if (status === 'transient') return 'sb-target-warn'
  return 'sb-target-unmet'
}

export const TargetsSummary = memo(function TargetsSummary({ targets, showEuNetExp = true }) {
  if (!targets?.endYearTarget) return null
  const { endYear, endYearTarget: sp, debtStabilization: stab, deficit3Pct: def3, euNetExpenditure: dpn } = targets
  const gapMd = sp.effortGapMd
  const gapPct = sp.effortGapPct
  const gapTone = Number.isFinite(gapMd) && gapMd <= 0.05 ? 'sb-target-ok' : 'sb-target-unmet'
  const gapHeadline = !Number.isFinite(gapMd)
    ? '—'
    : gapMd > 0.05
      ? `Manque ${fmt(gapMd, 1)} Md€ (${fmt(gapPct, 2, { signed: true })} pt PIB)`
      : gapMd < -0.05
        ? `Marge de ${fmt(Math.abs(gapMd), 1)} Md€ (${fmt(gapPct, 2, { signed: true })} pt PIB)`
        : 'À l\'équilibre stabilisant (0,0 Md€)'

  const stabHeadline = stab.status === 'sustained'
    ? `Stabilisée dès ${stab.year}`
    : stab.status === 'transient'
      ? `Temporaire (${stab.firstYear}${stab.lastYear > stab.firstYear ? `–${stab.lastYear}` : ''})`
      : `Non atteinte d'ici ${endYear}`
  const stabSub = stab.status === 'transient'
    ? `Repart à la hausse ensuite (${fmt(stab.endDeltaPp, 2, { signed: true })} pt en ${endYear})`
    : `Variation en ${endYear} : ${fmt(stab.endDeltaPp, 2, { signed: true })} pt de PIB`

  const def3Headline = def3.status === 'sustained'
    ? `≤ 3 % de déficit dès ${def3.year}`
    : def3.status === 'transient'
      ? `Temporaire (${def3.firstYear}${def3.lastYear > def3.firstYear ? `–${def3.lastYear}` : ''})`
      : `Non atteint d'ici ${endYear}`
  const nearThreshold = def3.status !== 'sustained' && Number.isFinite(def3.endBalancePct) && def3.endBalancePct > -3.005 && def3.endBalancePct < -3
  const def3Sub = nearThreshold
    ? `Légèrement sous −3,0 % en ${endYear} (${fmt(def3.endBalancePct, 3)} %)`
    : def3.status === 'transient'
      ? `Repasse sous −3 % ensuite (${fmt(def3.endBalancePct, 2)} % en ${endYear})`
      : `Solde APU en ${endYear} : ${fmt(def3.endBalancePct, 2)} % du PIB`

  return (
    <div className="sb-targets" role="region" aria-label="Repères budgétaires français et européens">
      <div className="sb-target">
        <div className="sb-target-head">
          <span className="sb-target-title">Solde primaire stabilisant ({endYear})</span>
          <InfoPopover label={`Solde primaire stabilisant en ${endYear}`}>
            <span className="sb-info-line">
              Solde primaire stabilisant le ratio dette/PIB l&apos;année {endYear} (équation E11 en temps discret exact) :{' '}
              <code>sp*(t) = [INT(t) − g_nom(t) × D(t−1)] / Y(t)</code>. Par identité comptable, la variation annuelle du ratio dette/PIB vaut exactement{' '}
              <code>sp*(t) − sp(t)</code>.
            </span>
            <span className="sb-info-line">
              Cible tendancielle hors variation ponctuelle de l&apos;écart de PIB : <strong>{fmt(sp.spStarStructPct, 2, { signed: true })} % du PIB</strong> ({fmt(sp.spStarStructMd, 1, { signed: true })} Md€).
            </span>
            <span className="sb-info-line">
              Attention : cet écart est mesuré <em>ex post</em> (après réaction comportementale θ, stabilisateurs et charge d&apos;intérêts), non en rendement statique <em>ex ante</em> des curseurs.
            </span>
          </InfoPopover>
        </div>
        <div className={`sb-target-val ${gapTone}`}>{gapHeadline}</div>
        <div className="sb-target-sub">
          Requis : {fmt(sp.spStarPct, 2, { signed: true })} % PIB · effectif : {fmt(sp.spActualPct, 2, { signed: true })} %
        </div>
      </div>

      <div className="sb-target">
        <div className="sb-target-head">
          <span className="sb-target-title">Stabilisation dette / PIB</span>
          <InfoPopover label="Année de stabilisation du ratio dette/PIB">
            <span className="sb-info-line">
              Première année à partir de laquelle le ratio dette/PIB cesse de croître (<code>Δ(D/Y) ≤ 0</code>) continûment jusqu&apos;à la fin de l&apos;horizon ({endYear}).
            </span>
            <span className="sb-info-line">
              Un recul isolé en 2027 causé uniquement par le gonflement transitoire du PIB lors d&apos;une relance (paradoxe du dénominateur) est exclu ; une stabilisation suivie d&apos;une rechute liée au refinancement du stock ancien ou au vieillissement est signalée comme « Temporaire ».
            </span>
          </InfoPopover>
        </div>
        <div className={`sb-target-val ${milestoneTone(stab.status)}`}>{stabHeadline}</div>
        <div className="sb-target-sub">{stabSub}</div>
      </div>

      <div className="sb-target">
        <div className="sb-target-head">
          <span className="sb-target-title">Seuil UE déficit ≤ 3 % PIB</span>
          <InfoPopover label="Seuil européen de déficit public de 3 % du PIB">
            <span className="sb-info-line">
              Repère juridique européen : besoin de financement de l&apos;ensemble des administrations publiques consolidées (S.13) au plus égal à 3,0 % du PIB, soit solde ≥ −3,0 % (art. 126 TFUE et Protocole n° 12 ; valeur de référence de dette : {fmt(PARAM_BY_ID['cmp.ue.dette_seuil'].value, 0)} % du PIB).
            </span>
            <span className="sb-info-sub">
              <strong>cmp.ue.solde_seuil</strong>
              <ParamInfo param={PARAM_BY_ID['cmp.ue.solde_seuil']} />
            </span>
          </InfoPopover>
        </div>
        <div className={`sb-target-val ${milestoneTone(def3.status)}`}>{def3Headline}</div>
        <div className="sb-target-sub">{def3Sub}</div>
      </div>

      {showEuNetExp && dpn && (
        <div className="sb-target">
          <div className="sb-target-head">
            <span className="sb-target-title">Règle UE dépense nette 2026–29</span>
            <InfoPopover label="Règle européenne de dépense primaire nette 2026–2029 (proxy)">
              <span className="sb-info-line">
                Proxy reconstitué de l&apos;indicateur opérationnel unique du cadre budgétaire européen réformé (Règlement (UE) 2024/1263, art. 2 pt 2 et art. 22 ; Recommandations du Conseil du 21 janv. 2025 sur le PSMT 2025–2029 : plafonds nominaux de +{fmt(PARAM_BY_ID['cmp.ue.dpn_plafond.2026_2028'].value, 1)} % en 2027–2028 et +{fmt(PARAM_BY_ID['cmp.ue.dpn_plafond.2029'].value, 1)} % en 2029, soit {fmt(dpn.avgCeilingPct, 2, { signed: true })} %/an ou {fmt(dpn.cumCeilingPct, 2, { signed: true })} % cumulés sur 2026–2029).
              </span>
              <span className="sb-info-line">
                Reconstitué sur la dépense primaire tendancielle hors intérêts et hors cycle (55,0 % du PIB en 2026 + dérives dA + dB), nette des économies de dépenses (après reports sociaux pour l&apos;âge légal) et des mesures nouvelles en recettes ex ante (DRM). Profil annuel : {fmt(dpn.annualGrowthPct[2027], 2, { signed: true })} % (2027), {fmt(dpn.annualGrowthPct[2028], 2, { signed: true })} % (2028), {fmt(dpn.annualGrowthPct[2029], 2, { signed: true })} % (2029). Limites : fonds UE, cofinancements et mesures ponctuelles non modélisés.
              </span>
              <span className="sb-info-sub">
                <strong>cmp.ue.dpn_plafond.2026_2028</strong>
                <ParamInfo param={PARAM_BY_ID['cmp.ue.dpn_plafond.2026_2028']} />
              </span>
            </InfoPopover>
          </div>
          <div className={`sb-target-val ${dpn.withinCeiling ? 'sb-target-ok' : 'sb-target-unmet'}`}>
            {fmt(dpn.avgGrowthPct, 2, { signed: true })} %/an · plafond {fmt(dpn.avgCeilingPct, 2, { signed: true })} %/an
          </div>
          <div className="sb-target-sub">
            <StatusBadge status={dpn.status} /> Cumul 26–29 : {fmt(dpn.cumGrowthPct, 1, { signed: true })} % (max {fmt(dpn.cumCeilingPct, 1, { signed: true })} %)
          </div>
        </div>
      )}
    </div>
  )
})

export const Snapshots = memo(function Snapshots({ snaps, targets = null }) {
  return (
    <section className="sb-section" aria-labelledby="sb-fiches">
      <h2 id="sb-fiches">Résultats clés</h2>
      <p className="sb-help">Vert : mieux que la référence ; rouge : moins bien (dette et intérêts plus bas, solde plus haut = mieux). Repères budgétaires ci-dessous à titre de comparaison (jamais des cibles internes du moteur).</p>
      <div className="sb-snaps">
        {snaps.map((s, i) => <SnapshotCard key={s.titre} titre={s.titre} snap={s.snap} explainParadox={i === 0} />)}
      </div>
      {targets && <TargetsSummary targets={targets} showEuNetExp />}
    </section>
  )
})

const KIND_ORDER = ['macro', 'statique', 'comportement', 'demande', 'offre', 'inflation', 'interets']
const KIND_TITLES = {
  macro: 'Hypothèses macroéconomiques',
  statique: 'Mesures : effet statique', comportement: 'Réaction comportementale et reports', demande: 'Demande',
  offre: 'Effets d\'offre', inflation: 'Inflation endogène (Phase 3)', interets: 'Intérêts',
}

export const DecompositionTable = memo(function DecompositionTable({ decomposition, years, yearIdx, onYear }) {
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
      {lines.length === 0 ? <p className="sb-empty">Aucun effet sur le solde cette année (aucun levier actif, ou mesure pas encore entrée en vigueur).</p> : (
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
                  {l.detail && <>{' '}<InfoPopover label={l.label}><span className="sb-info-line">{l.detail}</span></InfoPopover></>}
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
})

export const BlocksTable = memo(function BlocksTable({ blocks, year }) {
  return (
    <section className="sb-section" aria-labelledby="sb-blocs">
      <h2 id="sb-blocs">Trois blocs en {year}</h2>
      <p className="sb-help">Solde de chaque bloc après charge d'intérêts. Le bloc local n'a pas de levier propre : il reçoit sa part des fonctions de dépense partagées avec l'État (clé de répartition provisoire) et les sorties des modules actifs, détaillées sur une ligne distincte.</p>
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
})
