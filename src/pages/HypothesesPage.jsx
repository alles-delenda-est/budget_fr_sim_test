import { BASELINE, BEHAVIORAL_RESPONSE, FISCAL_MULTIPLIERS } from '../policy-impact'
import { MACRO_BASELINE } from '../projection-engine-v1.8'
import ASSUMPTIONS from '../data/assumptions'
import './HypothesesPage.css'

const TAX_LABELS = {
  incomeTax: "Impôt sur le revenu (IR)",
  corporateTax: "Impôt sur les sociétés (IS)",
  vat: "TVA",
  csg: "CSG",
  socialContributions: "Cotisations sociales",
}

const MULTIPLIER_LABELS = {
  education: "Éducation",
  defense: "Défense",
  solidarity: "Solidarité",
  pensions: "Retraites",
  health: "Santé",
}

function AssumptionTable({ title, note, items, columns }) {
  const cols = columns || [
    { key: 'parameter', label: 'Hypothèse' },
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
        <h2>Budget de référence : PLF 2025 + PLFSS 2026</h2>
        <p className="section-subtitle">Projet de loi de finances initial (Michel Barnier)</p>

        <div className="baseline-grid">
          {/* ÉTAT */}
          <div className="baseline-column">
            <h3>État (PLF 2025)</h3>
            <table className="baseline-table">
              <thead><tr><th>Recettes</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Impôt sur le revenu</td><td className="amount">{BASELINE.etat.incomeTax}</td></tr>
                <tr><td>TVA</td><td className="amount">{BASELINE.etat.vat}</td></tr>
                <tr><td>Impôt sur les sociétés</td><td className="amount">{BASELINE.etat.corporateTax}</td></tr>
                <tr><td>Autres recettes fiscales</td><td className="amount">{BASELINE.etat.otherTax}</td></tr>
                <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.etat.revenuTotal}</td></tr>
              </tbody>
            </table>
            <table className="baseline-table">
              <thead><tr><th>Dépenses</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Éducation nationale</td><td className="amount">{BASELINE.etat.education}</td></tr>
                <tr><td>Défense</td><td className="amount">{BASELINE.etat.defense}</td></tr>
                <tr><td>Solidarité & insertion</td><td className="amount">{BASELINE.etat.solidarity}</td></tr>
                <tr><td>Transition écologique</td><td className="amount">{BASELINE.etat.ecological}</td></tr>
                <tr><td>Autres missions</td><td className="amount">{BASELINE.etat.otherSpending}</td></tr>
                <tr className="total-row"><td>Total dépenses</td><td className="amount">{BASELINE.etat.spendingTotal}</td></tr>
              </tbody>
            </table>
            <div className="deficit-box etat">
              <span>Déficit État</span>
              <span className="deficit-value">{BASELINE.etat.deficit} Md\u20ac</span>
            </div>
          </div>

          {/* SÉCURITÉ SOCIALE */}
          <div className="baseline-column">
            <h3>Sécurité Sociale (PLFSS 2026)</h3>
            <table className="baseline-table">
              <thead><tr><th>Recettes</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Cotisations sociales</td><td className="amount">{BASELINE.securiteSociale.cotisations}</td></tr>
                <tr><td>CSG (toutes sources)</td><td className="amount">{BASELINE.securiteSociale.csg}</td></tr>
                <tr><td>Impôts et taxes affectés</td><td className="amount">{BASELINE.securiteSociale.impotsTaxes}</td></tr>
                <tr><td>Compensations État</td><td className="amount">{BASELINE.securiteSociale.cotisationsEtat}</td></tr>
                <tr><td>Transferts inter-régimes</td><td className="amount">{BASELINE.securiteSociale.transferts}</td></tr>
                <tr><td>Autres produits</td><td className="amount">{BASELINE.securiteSociale.autresProduits}</td></tr>
                <tr className="total-row"><td>Total recettes</td><td className="amount">{BASELINE.securiteSociale.revenuTotal}</td></tr>
              </tbody>
            </table>
            <table className="baseline-table">
              <thead><tr><th>Dépenses</th><th className="amount">Md\u20ac</th></tr></thead>
              <tbody>
                <tr><td>Vieillesse (retraites)</td><td className="amount">{BASELINE.securiteSociale.vieillesse}</td></tr>
                <tr><td>Maladie</td><td className="amount">{BASELINE.securiteSociale.maladie}</td></tr>
                <tr><td>Famille</td><td className="amount">{BASELINE.securiteSociale.famille}</td></tr>
                <tr><td>Accidents du travail (AT-MP)</td><td className="amount">{BASELINE.securiteSociale.atmp}</td></tr>
                <tr><td>Autonomie</td><td className="amount">{BASELINE.securiteSociale.autonomie}</td></tr>
                <tr className="total-row"><td>Total dépenses</td><td className="amount">{BASELINE.securiteSociale.spendingTotal}</td></tr>
              </tbody>
            </table>
            <div className="deficit-box ss">
              <span>Déficit Sécurité Sociale</span>
              <span className="deficit-value">{BASELINE.securiteSociale.deficit} Md\u20ac</span>
            </div>
          </div>
        </div>

        {/* CONSOLIDATED */}
        <div className="consolidated-box">
          <h3>APU Consolidées (État + Sécurité Sociale)</h3>
          <div className="consolidated-row"><span>Total recettes</span><span className="amount">{BASELINE.integrated.revenuTotal} Md\u20ac</span></div>
          <div className="consolidated-row"><span>Total dépenses</span><span className="amount">{BASELINE.integrated.spendingTotal} Md\u20ac</span></div>
          <div className="consolidated-row deficit"><span>Déficit total</span><span className="amount">{BASELINE.integrated.deficit} Md\u20ac</span></div>
          <p className="consolidated-note">Soit environ {Math.abs(BASELINE.integrated.deficit / MACRO_BASELINE.gdp * 100).toFixed(1)}% du PIB</p>
        </div>

        <p className="source-note">Sources : PLF 2025 (Barnier), PLFSS 2026 Annexe 3, CCSS 2024 (structure des recettes SS)</p>
      </section>

      {/* ASSUMPTIONS */}
      <section className="assumptions-section">
        <h2>Hypothèses du modèle</h2>
        <p className="section-subtitle">Paramètres économiques et sources académiques</p>

        <AssumptionTable title="Paramètres macroéconomiques" items={ASSUMPTIONS.macro} />
        <AssumptionTable title="Élasticités fiscales" items={ASSUMPTIONS.fiscal} />

        {/* BEHAVIORAL RESPONSE — custom table */}
        <div className="assumptions-category">
          <h3>Réponse comportementale aux taxes (ETI)</h3>
          <p className="assumptions-note">
            increaseEfficiency = fraction du rendement statique réalisée pour une hausse.
            decreaseEfficiency = multiplicateur pour une baisse (effet offre modéré).
            growthDragPerPp = frein croissance par pp de hausse.
          </p>
          <table className="assumptions-table">
            <thead>
              <tr><th>Taxe</th><th>Efficacité hausse</th><th>Efficacité baisse</th><th>Frein croissance/pp</th></tr>
            </thead>
            <tbody>
              {Object.entries(BEHAVIORAL_RESPONSE).map(([key, val]) => (
                <tr key={key}>
                  <td>{TAX_LABELS[key] || key}</td>
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
          <h3>Multiplicateurs fiscaux des dépenses</h3>
          <p className="assumptions-note">
            Multiplicateurs en expansion (gap de production ~ 0, France 2025).
            Offset monétaire = 0 (BCE supranationale, pas de crowding-out national).
          </p>
          <table className="assumptions-table">
            <thead><tr><th>Catégorie</th><th>Expansion (gap ~ 0)</th><th>Récession (gap &lt; 0)</th></tr></thead>
            <tbody>
              {Object.entries(FISCAL_MULTIPLIERS).map(([key, val]) => (
                <tr key={key}>
                  <td>{MULTIPLIER_LABELS[key] || key}</td>
                  <td className="value">{val.expansion.toFixed(2)}</td>
                  <td className="value">{val.recession.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <AssumptionTable title="Prime de risque souverain + inertie dette" items={ASSUMPTIONS.riskPremium} />
        <AssumptionTable title="Paramètres démographiques et structurels (francetdb.com)" items={ASSUMPTIONS.demographic}
          note="Intégrations de données réelles : dérive démographique, prime politique OAT, plancher ONDAM, emploi seniors." />
        <AssumptionTable title="Réforme des retraites et soutenabilité (francetdb.com/#retraites)" items={ASSUMPTIONS.pensionReform}
          note="Paramètres du modèle de réforme des retraites, migration, et dépendance. Source : francetdb.com, COR 2024, INSEE, DREES." />
        <AssumptionTable title="Boost croissance des baisses d'impôts" items={ASSUMPTIONS.taxCutBoosts}
          note="Effet symétrique (mais asymétrique en magnitude) des baisses d'impôts sur la croissance." />
        <AssumptionTable title="Réformes structurelles" items={ASSUMPTIONS.reforms} />

        <p className="methodology-note">
          Les paramètres sont calibrés sur la littérature académique et les publications institutionnelles.
          L'incertitude sur ces valeurs est significative ; le modèle est à visée pédagogique.
        </p>
      </section>
    </div>
  )
}
