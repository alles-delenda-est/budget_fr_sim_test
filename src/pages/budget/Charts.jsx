import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fmt } from './helpers'

const CHARTS = [
  { id: 'debt', titre: 'Dette publique', unite: '% du PIB', key: 'debt', ref: 'debtRef', dec: 1 },
  { id: 'balance', titre: 'Solde public', unite: '% du PIB', key: 'balance', ref: 'balanceRef', dec: 2 },
  { id: 'interest', titre: 'Charge d\'intérêts', unite: '% du PIB', key: 'interest', ref: 'interestRef', dec: 2 },
  { id: 'gdp', titre: 'Écart de PIB à la référence', unite: '%', key: 'gdpGap', ref: 'gdpGapRef', dec: 2 },
  { id: 'unemployment', titre: 'Chômage', unite: '% de la population active', key: 'unemployment', ref: 'unemploymentRef', dec: 1, tickDec: 1 },
]

/** Unité affichée dans l'infobulle : « % du PIB » tel quel, « % » pour les autres séries en pourcentage. */
const tooltipUnit = (spec) => (spec.unite.startsWith('% du PIB') ? spec.unite : '%')

function SimpleChart({ spec, data }) {
  const tick = { fontSize: 11 }
  return (
    <figure className="sb-chart" aria-label={`${spec.titre} (${spec.unite})`}>
      <figcaption>{spec.titre} <span className="sb-muted">({spec.unite})</span></figcaption>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={tick} minTickGap={24} />
          <YAxis tick={tick} width={44} tickFormatter={(v) => fmt(v, spec.tickDec ?? (spec.dec === 1 ? 0 : 1))} domain={['auto', 'auto']} />
          <Tooltip formatter={(v) => `${fmt(v, spec.dec)} ${tooltipUnit(spec)}`.trim()} labelFormatter={(y) => `Année ${y}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey={spec.key} name="Scénario" stroke="#5c6bc0" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
          <Line type="monotone" dataKey={spec.ref} name="Référence (sans levier)" stroke="#6b6b6b" strokeWidth={1.75} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

export default function Charts({ data }) {
  return (
    <section className="sb-section" aria-labelledby="sb-graphiques">
      <h2 id="sb-graphiques">Trajectoires</h2>
      <p className="sb-help">Trait plein : votre scénario. Pointillés : la référence, sans aucun levier.</p>
      <div className="sb-charts">
        {CHARTS.map((c) => <SimpleChart key={c.id} spec={c} data={data} />)}
      </div>
    </section>
  )
}
