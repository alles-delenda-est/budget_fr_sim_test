import { BASELINE, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from '../policy-impact'
import { MACRO_BASELINE } from '../projection-engine-v1.8'
import ASSUMPTIONS from '../data/assumptions'
import './HypothesesPage.css'

function AssumptionTable({ title, note, items, columns }) {
  const cols = columns || [
    { key: 'parameter', label: 'Hypothese' },
    { key: 'value', label: 'Valeur', className: 'value' },
    { key: 'impact', label: 'Impact' },
    { key: 'source', label: 'Source', render: (item) => item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer">{item.source}</a> : item.source },
  ]

  return (
    <div className="assumptions-category">
      <h3>{title}</h3>
      {note && <p className="assumptions-note">{note}</p>}
      <table className="assumptions-table">
        <thead>
          <tr>{cols.map(c => <th key={c.key}>{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c.key} className={c.className || ''}>
                  {c.render ? c.render(item) : item[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function HypothesesPage() {
  return (
    <div className="hypotheses-page">

      {/* BASELINE BUDGET */}
      <section className="baseline-section">
        <h2>Budget de reference : PLF 2025 + PLFSS 2026</h2>
        <p className="section-subtitle">Projet de loi de finances initial (Michel Barnier)</p>

        <div className="baseline-grid">
          {/* ETAT */}
          <div className="baseline-column">
            <h3>Etat (PLF 2025)</h3>
            <table className="baseline-table">
              <thead><tr><th>Recettes</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Impot sur le revenu</td><td className="amount">{BASELINE.etat.incomeTax}</td></tr>
                <tr><td>TVA</td><td className="amount">{BASELINE.etat.vat}</td></tr>
                <tr><td>Impot sur les societes</td><td className="amount">{BASELINE.etat.corporateTax}</td></tr>
                <tr><td>Autres recettes fiscales</td><td className="amount">{BASELINE.etat.otherTax}</td></tr>
                <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.etat.revenuTotal}</td></tr>
              </tbody>
            </table>
            <table className="baseline-table">
              <thead><tr><th>Depenses</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Education nationale</td><td className="amount">{BASELINE.etat.education}</td></tr>
                <tr><td>Defense</td><td className="amount">{BASELINE.etat.defense}</td></tr>
                <tr><td>Solidarite & insertion</td><td className="amount">{BASELINE.etat.solidarity}</td></tr>
                <tr><td>Transition ecologique</td><td className="amount">{BASELINE.etat.ecological}</td></tr>
                <tr><td>Autres missions</td><td className="amount">{BASELINE.etat.otherSpending}</td></tr>
                <tr className="total-row"><td>Total depenses</td><td className="amount">{BASELINE.etat.spendingTotal}</td></tr>
              </tbody>
            </table>
            <div className="deficit-box etat">
              <span>Deficit Etat</span>
              <span className="deficit-value">{BASELINE.etat.deficit} Md\u20ac</span>
            </div>
          </div>

          {/* SECURITE SOCIALE */}
          <div className="baseline-column">
            <h3>Securite Sociale (PLFSS 2026)</h3>
            <table className="baseline-table">
              <thead><tr><th>Recettes</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Cotisations sociales</td><td className="amount">{BASELINE.securiteSociale.cotisations}</td></tr>
                <tr><td>CSG (toutes sources)</td><td className="amount">{BASELINE.securiteSociale.csg}</td></tr>
                <tr><td>Impots et taxes affectes</td><td className="amount">{BASELINE.securiteSociale.impotsTaxes}</td></tr>
                <tr><td>Compensations Etat</td><td className="amount">{BASELINE.securiteSociale.cotisationsEtat}</td></tr>
                <tr><td>Transferts inter-regimes</td><td className="amount">{BASELINE.securiteSociale.transferts}</td></tr>
                <tr><td>Autres produits</td><td className="amount">{BASELINE.securiteSociale.autresProduits}</td></tr>
                <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.securiteSociale.revenuTotal}</td></tr>
              </tbody>
            </table>
            <table className="baseline-table">
              <thead><tr><th>Depenses</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Vieillesse (retraites)</td><td className="amount">{BASELINE.securiteSociale.vieillesse}</td></tr>
                <tr><td>Maladie</td><td className="amount">{BASELINE.securiteSociale.maladie}</td></tr>
                <tr><td>Famille</td><td className="amount">{BASELINE.securiteSociale.famille}</td></tr>
                <tr><td>Accidents du travail (AT-MP)</td><td className="amount">{BASELINE.securiteSociale.atmp}</td></tr>
                <tr><td>Autonomie</td><td className="amount">{BASELINE.securiteSociale.autonomie}</td></tr>
                <tr className="total-row"><td>Total depenses</td><td className="amount">{BASELINE.securiteSociale.spendingTotal}</td></tr>
              </tbody>
            </table>
            <div className="deficit-box ss">
              <span>Deficit Securite Sociale</span>
              <span className="deficit-value">{BASELINE.securiteSociale.deficit} Md\u20ac</span>
            </div>
          </div>
        </div>

        {/* CONSOLIDATED */}
        <div className="consolidated-box">
          <h3>APU Consolidees (Etat + Securite Sociale)</h3>
          <div className="consolidated-row"><span>Total recettes</span><span className="amount">{BASELINE.integrated.revenuTotal} Md\u20ac</span></div>
          <div className="consolidated-row"><span>Total depenses</span><span className="amount">{BASELINE.integrated.spendingTotal} Md\u20ac</span></div>
          <div className="consolidated-row deficit"><span>Deficit total</span><span className="amount">{BASELINE.integrated.deficit} Md\u20ac</span></div>
          <p className="consolidated-note">Soit environ {Math.abs(BASELINE.integrated.deficit / MACRO_BASELINE.gdp * 100).toFixed(1)}% du PIB</p>
        </div>

        <p className="source-note">Sources : PLF 2025 (Barnier), PLFSS 2026 Annexe 3, CCSS 2024 (structure des recettes SS)</p>
      </section>

      {/* ASSUMPTIONS */}
      <section className="assumptions-section">
        <h2>Hypotheses du modele</h2>
        <p className="section-subtitle">Parametres economiques et sources academiques</p>

        <AssumptionTable title="Parametres macroeconomiques" items={ASSUMPTIONS.macro} />
        <AssumptionTable title="Elasticites fiscales" items={ASSUMPTIONS.fiscal} />

        {/* BEHAVIORAL RESPONSE — custom table */}
        <div className="assumptions-category">
          <h3>Reponse comportementale aux taxes (ETI)</h3>
          <p className="assumptions-note">
            increaseEfficiency = fraction du rendement statique realisee pour une hausse.
            decreaseEfficiency = multiplicateur pour une baisse (effet offre modere).
            growthDragPerPp = frein croissance par pp de hausse.
          </p>
          <table className="assumptions-table">
            <thead>
              <tr><th>Taxe</th><th>Efficacite hausse</th><th>Efficacite baisse</th><th>Frein croissance/pp</th></tr>
            </thead>
            <tbody>
              {Object.entries(BEHAVIORAL_RESPONSE).map(([key, val]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td className="value">{(val.increaseEfficiency * 100).toFixed(0)}%</td>
                  <td className="value">{(val.decreaseEfficiency * 100).toFixed(0)}%</td>
                  <td className="value">{(val.growthDragPerPp * 100).toFixed(2)} pp</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FISCAL MULTIPLIERS — custom table */}
        <div className="assumptions-category">
          <h3>Multiplicateurs fiscaux des depenses</h3>
          <p className="assumptions-note">
            Multiplicateurs en expansion (gap de production ~ 0, France 2025).
            Offset monetaire = 0 (BCE supranationale, pas de crowding-out national).
          </p>
          <table className="assumptions-table">
            <thead><tr><th>Categorie</th><th>Expansion (gap ~ 0)</th><th>Recession (gap &lt; 0)</th></tr></thead>
            <tbody>
              {Object.entries(FISCAL_MULTIPLIERS).map(([key, val]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td className="value">{val.expansion.toFixed(2)}</td>
                  <td className="value">{val.recession.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AssumptionTable title="Prime de risque souverain + inertie dette" items={ASSUMPTIONS.riskPremium} />
        <AssumptionTable title="Parametres demographiques et structurels (francetdb.com)" items={ASSUMPTIONS.demographic}
          note="Integrations de donnees reelles: derive demographique, prime politique OAT, plancher ONDAM, emploi seniors." />
        <AssumptionTable title="Reforme des retraites et soutenabilite (francetdb.com/#retraites)" items={ASSUMPTIONS.pensionReform}
          note="Parametres du modele de reforme des retraites, migration, et dependance. Source: francetdb.com, COR 2024, INSEE, DREES." />
        <AssumptionTable title="Boost croissance des baisses d'impots" items={ASSUMPTIONS.taxCutBoosts}
          note="Effet symetrique (mais asymetrique en magnitude) des baisses d'impots sur la croissance." />
        <AssumptionTable title="Reformes structurelles" items={ASSUMPTIONS.reforms} />

        <p className="methodology-note">
          Les parametres sont calibres sur la litterature academique et les publications institutionnelles.
          L'incertitude sur ces valeurs est significative ; le modele est a visee pedagogique.
        </p>
      </section>
    </div>
  )
}
