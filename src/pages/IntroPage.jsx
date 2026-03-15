import { useMemo } from 'react'
import { getBaselineProjection, DEMOGRAPHIC_PRESSURE_PER_YEAR } from '../projection-engine-v1.8'
import './IntroPage.css'

export default function IntroPage({ navigateTo }) {
  // Compute baseline dynamically so numbers stay in sync with the model
  const baseline = useMemo(() => getBaselineProjection(10), [])
  const yr0 = baseline[0]
  const yr10 = baseline[10]

  return (
    <div className="intro-page">
      <section className="intro-section">
        <h2>Pourquoi ce simulateur ?</h2>
        <p>
          La France fait face à un défi budgétaire structurel. Avec une dette publique de <strong>{yr0.debt} Md\u20ac</strong> ({yr0.debtRatio}% du PIB)
          et un déficit de <strong>{Math.abs(yr0.deficit).toFixed(0)} Md\u20ac</strong>, le débat public est dominé par des affirmations simplistes :
          &laquo; il suffit de couper les dépenses &raquo; ou &laquo; il suffit d'augmenter les impôts &raquo;.
        </p>
        <p>
          La réalité est plus complexe. Les hausses d'impôts ne rapportent pas autant qu'annoncé (réponses comportementales),
          les coupes de dépenses ont des effets sur la croissance (multiplicateurs fiscaux), et la dette elle-même génère
          un cercle vicieux via les taux d'intérêt (doom loop).
        </p>
        <p>
          Ce simulateur permet d'explorer ces mécanismes de manière interactive et transparente.
          Chaque paramètre est sourcé académiquement et documenté dans l'onglet <em>Hypothèses</em>.
        </p>
      </section>

      <section className="intro-section">
        <h2>Comment fonctionne le modèle ?</h2>
        <div className="mechanism-cards">
          <div className="mechanism-card">
            <h3>Réponse comportementale (ETI)</h3>
            <p>
              Quand on augmente un impôt, une partie des recettes espérées disparaît : les contribuables ajustent
              leur comportement (émigration fiscale, optimisation, réduction d'activité). L'impôt sur les sociétés est
              le plus &laquo; fuyant &raquo; (55% d'efficacité), la TVA le plus efficace (92%).
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Boucle dette-intérêt</h3>
            <p>
              Une dette plus élevée fait monter les taux d'intérêt, ce qui augmente le déficit, ce qui augmente la dette.
              Le modèle utilise un système à 4 régimes : en dessous de 60% du PIB, les marchés sont calmes.
              Au-dessus de 120%, les primes s'accélèrent fortement (10 bps par point supplémentaire).
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Dérive démographique</h3>
            <p>
              Le vieillissement de la population ajoute automatiquement <strong>+{(10 * DEMOGRAPHIC_PRESSURE_PER_YEAR).toFixed(0)} Md\u20ac</strong> de
              dépenses supplémentaires sur 10 ans, indépendamment de toute décision politique.
              C'est le vent contraire que tout scénario doit surmonter avant de pouvoir améliorer les comptes.
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Inertie de la dette</h3>
            <p>
              La France refinance environ 12,5% de sa dette chaque année (maturité moyenne 8 ans).
              Cela signifie qu'un choc de taux met des années à se transmettre pleinement, mais aussi
              qu'une fois les taux montés, les coûts restent élevés pendant longtemps.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Que se passe-t-il sans rien faire ?</h2>
        <p>
          Dans le scénario de base (aucun changement de politique), le modèle projette :
        </p>
        <div className="baseline-summary">
          <div className="baseline-metric">
            <span className="baseline-label">Dette/PIB à 10 ans</span>
            <span className="baseline-value warning">{yr10.debtRatio}%</span>
            <span className="baseline-delta">+{(yr10.debtRatio - yr0.debtRatio).toFixed(1)} pp</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Déficit à 10 ans</span>
            <span className="baseline-value warning">{yr10.deficit} Md\u20ac</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Charge d'intérêts</span>
            <span className="baseline-value">{yr10.interest} Md\u20ac</span>
            <span className="baseline-delta">+{(yr10.interest - yr0.interest).toFixed(0)} Md\u20ac vs aujourd'hui</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Pression démographique cumulée</span>
            <span className="baseline-value warning">+{yr10.demographicPressure} Md\u20ac</span>
          </div>
        </div>
        <p>
          La dérive est entièrement pilotée par la démographie et les taux d'intérêt.
          Sans réformes structurelles ni ajustements budgétaires, la trajectoire se dégrade mécaniquement.
        </p>
      </section>

      <section className="intro-section">
        <h2>Deux simulateurs, un seul moteur</h2>
        <p>
          Le site propose deux simulateurs complémentaires, fondés sur le même moteur de projection :
        </p>
        <div className="simulator-cards">
          <div className="simulator-card" role="button" tabIndex={0} aria-label="Ouvrir le simulateur budget" onClick={() => navigateTo?.('budget')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo?.('budget') } }}>
            <h3>Simulateur Budget</h3>
            <p>
              Vue complète : impôts (IR, TVA, IS), dépenses (éducation, défense, solidarité),
              sécurité sociale (ONDAM, cotisations, CSG), réformes structurelles, et réformes des retraites.
              4 scénarios politiques pré-configurés (PLF 2025, Génération Libre, Knafo, NFP).
            </p>
          </div>
          <div className="simulator-card" role="button" tabIndex={0} aria-label="Ouvrir le simulateur retraites" onClick={() => navigateTo?.('retraites')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo?.('retraites') } }}>
            <h3>Simulateur Retraites</h3>
            <p>
              Vue focalisée sur le système de retraites : âge de départ, désindexation,
              plafonnement, comptes notionnels, scénarios COR, emploi seniors.
              Contextualisé par la démographie, la migration, et la dépendance.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Limites du modèle</h2>
        <p>
          Ce simulateur est un outil <strong>pédagogique</strong>, pas un outil de prévision.
          Les chiffres sont directionnellement corrects et internement cohérents, mais l'incertitude
          sur les paramètres est significative. Parmi les limites principales :
        </p>
        <ul className="limitations-list">
          <li>Pas de collectivités locales (État + ASSO = ~89% des dépenses publiques)</li>
          <li>Modèle déterministe (pas de bandes d'incertitude)</li>
          <li>Inflation fixe à 1,8% (pas de réponse endogène des prix)</li>
          <li>Effets des réformes estimés à partir de panels OCDE (transposition France incertaine)</li>
          <li>Pas de contagion financière (la boucle dette-intérêt est heuristique)</li>
        </ul>
        <p>
          Pour les détails complets de chaque paramètre et ses sources académiques,
          consultez l'onglet <em>Hypothèses & Paramètres</em>.
        </p>
      </section>
    </div>
  )
}
