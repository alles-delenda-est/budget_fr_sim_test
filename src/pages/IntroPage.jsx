import { useMemo } from 'react'
import { projectScenario, issuanceRate, HORIZONS, RATE_MAX, START_YEAR } from '../engine/project.js'
import { resolveParams, PARAM_BY_ID } from '../engine/params.js'
import { LEVERS, STRUCTURAL_LEVERS, LEVER_BY_ID } from '../engine/levers.js'
import { WARNING_THRESHOLDS as W } from '../config.js'
import { fmt } from './budget/helpers'
import { evaluateWarnings } from './budget/warnings'
import { macroGrowthSourceLabel } from './hypotheses/helpers'
import { LEGAL_AGE_BASE } from './retraites/helpers'
import './IntroPage.css'

const AGE_LEVER = LEVER_BY_ID['age_legal']
/** Statuts distincts d'une liste de paramètres, joints par « / » (lus dans PARAM_BY_ID). */
const statusOf = (...ids) => [...new Set(ids.map((id) => PARAM_BY_ID[id].status))].join(' / ')

export default function IntroPage({ navigateTo }) {
  const data = useMemo(() => {
    const P = resolveParams()
    const ref10 = projectScenario({ horizon: 'dixAns' })
    const ref30 = projectScenario({ horizon: 'trenteAns' })
    const betaLow = PARAM_BY_ID['dette.beta'].low
    const betaHigh = PARAM_BY_ID['dette.beta'].high
    const ref30Beta0 = projectScenario({ horizon: 'trenteAns', overrides: { 'dette.beta': 0 } })
    const ref30BetaLow = projectScenario({ horizon: 'trenteAns', overrides: { 'dette.beta': betaLow } })
    const ref30BetaHigh = projectScenario({ horizon: 'trenteAns', overrides: { 'dette.beta': betaHigh } })

    const end10 = ref10.total[ref10.total.length - 1]
    const end30 = ref30.total[ref30.total.length - 1]
    const last = (r) => r.total[r.total.length - 1]

    return {
      P,
      iStarPct: issuanceRate(P) * 100,
      end10,
      end30,
      warnings30: evaluateWarnings(ref30),
      betaLow,
      betaHigh,
      debt30Beta0: last(ref30Beta0).debtRatio * 100,
      debt30BetaLow: last(ref30BetaLow).debtRatio * 100,
      debt30BetaHigh: last(ref30BetaHigh).debtRatio * 100,
    }
  }, [])

  const { P, iStarPct, end10, end30, warnings30, betaLow, betaHigh, debt30Beta0, debt30BetaLow, debt30BetaHigh } = data
  const debt2025 = P['base.dette.2025']
  const debtRatio2025 = P['base.dette.ratio_2025']
  const solde2025 = P['base.solde.apu']
  const pib2025 = P['base.pib.2025']
  const soldeRatio2025 = (solde2025 / pib2025) * 100
  const interets2025 = P['base.interets.apu']
  const debt10Pct = end10.debtRatio * 100
  const bal10Pct = end10.balanceRatio * 100
  const int10Pct = end10.interestRatio * 100
  const rate10Pct = end10.avgRate * 100

  const handleCardKey = (page) => (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      navigateTo?.(page)
    }
  }

  return (
    <div className="intro-page">
      <section className="intro-section">
        <h2>Pourquoi ce simulateur ?</h2>
        <p>
          Les finances publiques françaises abordent la période 2026–2056 avec une dette brute (Maastricht) de{' '}
          <strong>{fmt(debt2025, 1)} Md€</strong> (<strong>{fmt(debtRatio2025, 1)} % du PIB</strong>), un solde public de{' '}
          <strong>{fmt(solde2025, 1)} Md€</strong> ({fmt(soldeRatio2025, 1)} % du PIB) et un PIB observé de{' '}
          <strong>{fmt(pib2025, 0)} Md€</strong> en 2025 (Insee, RESF 2027). Le débat public réduit souvent la question à
          des affirmations rapides : &laquo; il suffit de couper les dépenses &raquo; ou &laquo; il suffit d'augmenter les impôts &raquo;.
        </p>
        <p>
          Le moteur v2 couvre les <strong>administrations publiques consolidées (APU)</strong> en comptabilité nationale,
          réparties en <strong>trois blocs</strong> : administrations centrales (État et ODAC), sécurité sociale (ASSO) et
          collectivités locales (APUL). Les transferts entre blocs sont consolidés pour éviter tout double compte.
        </p>
        <p>
          L'objectif est pédagogique et transparent : montrer comment chaque mesure agit sur le solde après réaction des
          contribuables, effets de demande, effets d'offre et charge d'intérêts. Chaque paramètre est documenté avec sa
          source et son statut de validation dans l'onglet <em>Hypothèses &amp; Paramètres</em>.
        </p>
      </section>

      <section className="intro-section">
        <h2>Comment fonctionne le modèle (équations E1–E12) ?</h2>
        <div className="mechanism-cards">
          <div className="mechanism-card">
            <h3>1. Trois blocs APU et dérive de référence (E1, E2, E8)</h3>
            <p>
              Les comptes sont ancrés sur 2025 (dernière année observée), avec 2026 en estimation et les leviers actifs dès
              2027 (janvier 2028 pour l'âge légal de retraite, fin du gel LFSS 2026). La croissance de référence 2026–2027 est
              la {macroGrowthSourceLabel()}, et la dérive spontanée intègre le vieillissement projeté par le COR
              (retraites) et la Commission européenne (santé).
            </p>
          </div>
          <div className="mechanism-card">
            <h3>2. Demande, réaction comportementale et effets d'offre (E3–E7, D13)</h3>
            <p>
              Les effets de demande jouent en niveau et s'estompent (persistance <code>λ = {fmt(P['dem.lambda'], 1)}</code>).
              La réaction comportementale <code>θ</code> est symétrique en paramètres, évaluée au taux après réforme, et
              réduite à sa seule part non réelle quand un effet d'offre <code>σ ≠ 0</code> existe. Les effets d'offre
              explicites (impôts sur le travail via <code>e_L = {fmt(P['offre.e_L'], 2)}</code>, IS via le coût d'usage du
              capital, âge légal, assurance chômage, enseignement) passent au solde par le taux de prélèvements obligatoires{' '}
              <code>ε_offre = {fmt(P['fisc.eps_offre'] * 100, 1)} %</code>, distinct des stabilisateurs de demande{' '}
              <code>ε = {fmt(P['fisc.eps'], 1)}</code>.
            </p>
          </div>
          <div className="mechanism-card">
            <h3>3. Taux de marché, prime β et inertie du stock (E9–E11)</h3>
            <p>
              Le taux à l'émission de référence est pondéré entre BTF, OAT 2–8 ans et OAT 10 ans et plus (
              <code>i* ≈ {fmt(iStarPct, 2)} %</code>). Au-delà du ratio de dette de 2026, une prime linéaire de{' '}
              <code>β = {fmt(P['dette.beta'], 0)} pb/pt</code> (fourchette {fmt(betaLow, 0)}–{fmt(betaHigh, 0)}) s'ajoute ; le
              taux à l'émission (i* + prime) est plafonné à {fmt(RATE_MAX * 100, 0)} %. Le stock de dette se renouvelle progressivement selon sa maturité moyenne (
              <code>M = {fmt(P['dette.M'], 2)} ans</code>) augmentée de la dette nouvelle.
            </p>
          </div>
          <div className="mechanism-card">
            <h3>4. Trois horizons et avertissements hors expérience</h3>
            <p>
              Les projections se lisent à 10 ans ({HORIZONS.dixAns.endYear}), en {HORIZONS.jusqua2040.endYear} et à 30 ans
              ({HORIZONS.trenteAns.endYear}). Deux paliers encadrent les trajectoires extrêmes : <strong>palier 1</strong>{' '}
              au-delà de {W.tier1DebtPct} % du PIB (record d'une économie avancée : Japon {W.tier1ReferencePct} % en{' '}
              {W.tier1ReferenceYear}, FMI) et <strong>palier 2</strong> au-delà de {W.tier2DebtPct} % du PIB ou quand les
              intérêts dépassent {W.tier2InterestShareRevenuePct} % des recettes publiques. Le palier 2 est une convention
              du simulateur : {fmt(W.tier2DebtPct / 100, 0)} fois le PIB, choisi très au-delà de tout cas enregistré.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Trajectoire de référence (hypothèses centrales)</h2>
        <p>
          Sans levier activé et avec les hypothèses centrales du moteur v2, la trajectoire de référence projette à{' '}
          <strong>10 ans ({end10.year})</strong> :
        </p>
        <div className="baseline-summary">
          <div className="baseline-metric">
            <span className="baseline-label">Dette / PIB ({end10.year})</span>
            <span className="baseline-value">{fmt(debt10Pct, 1)} %</span>
            <span className="baseline-delta">{fmt(debt10Pct - debtRatio2025, 1, { signed: true })} pt vs 2025</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Solde public ({end10.year})</span>
            <span className="baseline-value">{fmt(bal10Pct, 2)} % du PIB</span>
            <span className="baseline-delta">{fmt(end10.balance, 0)} Md€</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Charge d'intérêts ({end10.year})</span>
            <span className="baseline-value">{fmt(end10.interest, 1)} Md€</span>
            <span className="baseline-delta">{fmt(int10Pct, 2)} % du PIB ({fmt(end10.interest - interets2025, 0, { signed: true })} Md€ vs 2025)</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Taux moyen du stock ({end10.year})</span>
            <span className="baseline-value">{fmt(rate10Pct, 2)} %</span>
            <span className="baseline-delta">contre {fmt(P['dette.i_moy_2025'], 1)} % en 2025 (i* ≈ {fmt(iStarPct, 2)} %)</span>
          </div>
        </div>

        <div className="intro-callout" role="note">
          <h3>À 30 ans ({end30.year}) : ce n'est pas une prévision, mais l'effet de l'hypothèse β</h3>
          <p>
            Sans mesure nouvelle, la dette de référence atteint <strong>{fmt(end30.debtRatio * 100, 0)} % du PIB</strong> en{' '}
            {end30.year} au centre (<code>β = {fmt(P['dette.beta'], 0)} pb/pt</code>)
            {warnings30.tier1 ? `, franchissant le palier 1 (${W.tier1DebtPct} %) dès ${warnings30.tier1.year}` : ''}
            {warnings30.tier2 ? ` puis le palier 2 en ${warnings30.tier2.year}` : ''}.
            Cette divergence n'est pas une prévision : elle mesure la sensibilité mécanique à la pente de taux{' '}
            <code>β</code> prolongée linéairement — en {end30.year}, la dette ressort à{' '}
            <strong>{fmt(debt30BetaLow, 0)} %</strong> pour <code>β = {fmt(betaLow, 0)}</code>,{' '}
            <strong>{fmt(debt30BetaHigh, 0)} %</strong> pour <code>β = {fmt(betaHigh, 0)}</code>, et{' '}
            <strong>{fmt(debt30Beta0, 0)} %</strong> sans prime (<code>β = 0</code>).
          </p>
        </div>
      </section>

      <section className="intro-section">
        <h2>Deux simulateurs, un seul moteur</h2>
        <p>
          Les deux onglets s'appuient sur le même moteur de projection (équations E1–E12) et les mêmes paramètres :
        </p>
        <div className="simulator-cards">
          <div
            className="simulator-card"
            role="button"
            tabIndex={0}
            aria-label="Ouvrir le simulateur budgétaire"
            onClick={() => navigateTo?.('budget')}
            onKeyDown={handleCardKey('budget')}
          >
            <h3>Simulateur Budget</h3>
            <p>
              <strong>{LEVERS.length} leviers actifs</strong> répartis en trois groupes (recettes, dépenses par fonction
              COFOG, prestations sociales) et <strong>{STRUCTURAL_LEVERS.length} leviers structurels</strong> affichés en
              « non validé — avis demandé » (σ = 0). Décomposition exacte du solde par cause (statique, comportement,
              demande, offre, intérêts), ventilation par bloc APU, liens partageables et export CSV.
            </p>
          </div>
          <div
            className="simulator-card"
            role="button"
            tabIndex={0}
            aria-label="Ouvrir le simulateur retraites"
            onClick={() => navigateTo?.('retraites')}
            onKeyDown={handleCardKey('retraites')}
          >
            <h3>Simulateur Retraites</h3>
            <p>
              Exploration des trajectoires du <strong>COR (juin 2026)</strong> selon la productivité (centrale, haute 1,0 %,
              basse 0,4 %) et la dérive santé / dépendance (Commission européenne 2024). Leviers retenus pour la version
              de relecture : <strong>âge légal de départ</strong> ({LEGAL_AGE_BASE + AGE_LEVER.min} à{' '}
              {LEGAL_AGE_BASE + AGE_LEVER.max} ans dès janvier {START_YEAR + AGE_LEVER.defaultRamp.start} avec effet d'offre emploi seniors ; statut
              « {statusOf('rend.age_legal', 'offre.sigma.age_legal')} ») et <strong>indexation des pensions</strong> (statut
              « {statusOf('ref.derive.a_retraites')} »), ainsi que le préréglage <strong>Comptes notionnels</strong> (forme
              réduite, non validé) et le plafonnement (désactivé, non validé).
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Limites assumées et statuts des paramètres</h2>
        <p>
          Ce simulateur est un outil <strong>pédagogique et de revue</strong>, non un outil de prévision. Ses limites
          principales sont documentées et assumées :
        </p>
        <ul className="limitations-list">
          <li>
            <strong>Modèle déterministe :</strong> pas de bandes de confiance probabilistes ; l'incertitude s'explore via
            les trois cas d'effets d'offre (bas / central / haut) et les fourchettes des paramètres.
          </li>
          <li>
            <strong>Inflation exogène :</strong> trajectoire tirée d'un petit nombre de prévisions publiées pour 2026–2027
            (statut « {statusOf('macro.pi.2026', 'macro.pi.2027')} »), sans boucle prix-salaires ni réponse endogène de
            l'inflation.
          </li>
          <li>
            <strong>Hypothèses de référence provisoires :</strong> la référence fixe la dérive des autres dépenses{' '}
            <code>ref.derive.b_autres</code> à {fmt(P['ref.derive.b_autres'], 1)} point de PIB par an{' '}
            (statut « {statusOf('ref.derive.b_autres')} »), ce qui la rend plus favorable que la règle prévue par la note de modèle ;
            la croissance et l'inflation 2026–2027 ont le statut « {statusOf('macro.g.2026', 'macro.g.2027', 'macro.pi.2026', 'macro.pi.2027')} ».
          </li>
          <li>
            <strong>Régime unique de multiplicateurs :</strong> multiplicateurs de demande d'expansion uniquement (pas de
            basculement automatique en récession).
          </li>
          <li>
            <strong>Pas de contagion financière :</strong> la boucle dette–taux prolonge linéairement <code>β</code>, le
            taux à l'émission étant plafonné à {fmt(RATE_MAX * 100, 0)} %, d'où les avertissements explicites au-delà de l'expérience historique.
          </li>
          <li>
            <strong>Transparence des statuts :</strong> chaque paramètre « de mémoire », « à collecter », « non validé » ou
            « calculé (estimation) » est signalé par une pastille dédiée dans toute l'interface.
          </li>
        </ul>
        <p className="intro-links-row">
          Consultez l'onglet{' '}
          <button type="button" className="intro-inline-link" onClick={() => navigateTo?.('hypotheses')}>
            Hypothèses &amp; Paramètres
          </button>{' '}
          pour le détail des comptes 2025, des équations E1–E12, de la table complète des paramètres et des trois questions
          ouvertes aux relecteurs.
        </p>
      </section>
    </div>
  )
}
