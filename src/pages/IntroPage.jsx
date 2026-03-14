import { useMemo } from 'react'
import { getBaselineProjection } from '../projection-engine-v1.8'
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
          La France fait face a un defi budgetaire structurel. Avec une dette publique de <strong>{yr0.debt} Md\u20ac</strong> ({yr0.debtRatio}% du PIB)
          et un deficit de <strong>{Math.abs(yr0.deficit).toFixed(0)} Md\u20ac</strong>, le debat public est domine par des affirmations simplistes :
          &laquo; il suffit de couper les depenses &raquo; ou &laquo; il suffit d'augmenter les impots &raquo;.
        </p>
        <p>
          La realite est plus complexe. Les hausses d'impots ne rapportent pas autant qu'annonce (reponses comportementales),
          les coupes de depenses ont des effets sur la croissance (multiplicateurs fiscaux), et la dette elle-meme genere
          un cercle vicieux via les taux d'interet (doom loop).
        </p>
        <p>
          Ce simulateur permet d'explorer ces mecanismes de maniere interactive et transparente.
          Chaque parametre est source academiquement et documente dans l'onglet <em>Hypotheses</em>.
        </p>
      </section>

      <section className="intro-section">
        <h2>Comment fonctionne le modele ?</h2>
        <div className="mechanism-cards">
          <div className="mechanism-card">
            <h3>Reponse comportementale (ETI)</h3>
            <p>
              Quand on augmente un impot, une partie des recettes esperees disparait : les contribuables ajustent
              leur comportement (emigration fiscale, optimisation, reduction d'activite). L'impot sur les societes est
              le plus &laquo; fuyant &raquo; (55% d'efficacite), la TVA le plus efficace (92%).
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Boucle dette-interet</h3>
            <p>
              Une dette plus elevee fait monter les taux d'interet, ce qui augmente le deficit, ce qui augmente la dette.
              Le modele utilise un systeme a 4 regimes : en dessous de 60% du PIB, les marches sont calmes.
              Au-dessus de 120%, les primes s'accelerent fortement (10 bps par point supplementaire).
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Derive demographique</h3>
            <p>
              Le vieillissement de la population ajoute automatiquement <strong>+{(10 * 1.795).toFixed(0)} Md\u20ac</strong> de
              depenses supplementaires sur 10 ans, independamment de toute decision politique.
              C'est le vent contraire que tout scenario doit surmonter avant de pouvoir ameliorer les comptes.
            </p>
          </div>
          <div className="mechanism-card">
            <h3>Inertie de la dette</h3>
            <p>
              La France refinance environ 12,5% de sa dette chaque annee (maturite moyenne 8 ans).
              Cela signifie qu'un choc de taux met des annees a se transmettre pleinement, mais aussi
              qu'une fois les taux montes, les couts restent eleves pendant longtemps.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Que se passe-t-il sans rien faire ?</h2>
        <p>
          Dans le scenario de base (aucun changement de politique), le modele projette :
        </p>
        <div className="baseline-summary">
          <div className="baseline-metric">
            <span className="baseline-label">Dette/PIB a 10 ans</span>
            <span className="baseline-value warning">{yr10.debtRatio}%</span>
            <span className="baseline-delta">+{(yr10.debtRatio - yr0.debtRatio).toFixed(1)} pp</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Deficit a 10 ans</span>
            <span className="baseline-value warning">{yr10.deficit} Md\u20ac</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Charge d'interets</span>
            <span className="baseline-value">{yr10.interest} Md\u20ac</span>
            <span className="baseline-delta">+{(yr10.interest - yr0.interest).toFixed(0)} Md\u20ac vs aujourd'hui</span>
          </div>
          <div className="baseline-metric">
            <span className="baseline-label">Pression demographique cumulee</span>
            <span className="baseline-value warning">+{yr10.demographicPressure} Md\u20ac</span>
          </div>
        </div>
        <p>
          La derive est entierement pilotee par la demographie et les taux d'interet.
          Sans reformes structurelles ni ajustements budgetaires, la trajectoire se degrade mecaniquement.
        </p>
      </section>

      <section className="intro-section">
        <h2>Deux simulateurs, un seul moteur</h2>
        <p>
          Le site propose deux simulateurs complementaires, fondes sur le meme moteur de projection :
        </p>
        <div className="simulator-cards">
          <div className="simulator-card" onClick={() => navigateTo?.('budget')}>
            <h3>Simulateur Budget</h3>
            <p>
              Vue complete : impots (IR, TVA, IS), depenses (education, defense, solidarite),
              securite sociale (ONDAM, cotisations, CSG), reformes structurelles, et reformes des retraites.
              4 scenarios politiques pre-configures (PLF 2025, Generation Libre, Knafo, NFP).
            </p>
          </div>
          <div className="simulator-card" onClick={() => navigateTo?.('retraites')}>
            <h3>Simulateur Retraites</h3>
            <p>
              Vue focalisee sur le systeme de retraites : age de depart, desindexation,
              plafonnement, comptes notionnels, scenarios COR, emploi seniors.
              Contextualise par la demographie, la migration, et la dependance.
            </p>
          </div>
        </div>
      </section>

      <section className="intro-section">
        <h2>Limites du modele</h2>
        <p>
          Ce simulateur est un outil <strong>pedagogique</strong>, pas un outil de prevision.
          Les chiffres sont directionnellement corrects et internement coherents, mais l'incertitude
          sur les parametres est significative. Parmi les limites principales :
        </p>
        <ul className="limitations-list">
          <li>Pas de collectivites locales (Etat + ASSO = ~89% des depenses publiques)</li>
          <li>Modele deterministe (pas de bandes d'incertitude)</li>
          <li>Inflation fixe a 1,8% (pas de reponse endogene des prix)</li>
          <li>Effets des reformes estimes a partir de panels OCDE (transposition France incertaine)</li>
          <li>Pas de contagion financiere (la boucle dette-interet est heuristique)</li>
        </ul>
        <p>
          Pour les details complets de chaque parametre et ses sources academiques,
          consultez l'onglet <em>Hypotheses & Parametres</em>.
        </p>
      </section>
    </div>
  )
}
