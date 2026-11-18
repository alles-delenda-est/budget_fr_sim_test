import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'
import { WARNING_THRESHOLDS as W } from '../../config'
import { fmt } from './helpers'
import { splitSeriesAtYear, visibleDomain } from './warnings'

const CHARTS = [
  { id: 'debt', titre: 'Dette publique', unite: '% du PIB', key: 'debt', ref: 'debtRef', dec: 1 },
  { id: 'balance', titre: 'Solde public', unite: '% du PIB', key: 'balance', ref: 'balanceRef', dec: 2 },
  { id: 'interest', titre: 'Charge d\'intérêts', unite: '% du PIB', key: 'interest', ref: 'interestRef', dec: 2 },
  { id: 'gdp', titre: 'Écart de PIB à la référence', unite: '%', key: 'gdpGap', ref: 'gdpGapRef', dec: 2 },
  { id: 'unemployment', titre: 'Chômage', unite: '% de la population active', key: 'unemployment', ref: 'unemploymentRef', dec: 1, tickDec: 1 },
]

/** Unité affichée dans l'infobulle : « % du PIB » tel quel, « % » pour les autres séries en pourcentage. */
const tooltipUnit = (spec) => (spec.unite.startsWith('% du PIB') ? spec.unite : '%')

function SimpleChart({ spec, data, tier1, tier2 }) {
  const tick = { fontSize: 11 }
  const beyond = tier2 ? `${spec.key}Beyond` : null
  // Après le palier 2, le trait du scénario est grisé et pointillé ; l'axe vertical ignore cette partie pour ne pas écraser les autres courbes.
  const domain = visibleDomain(data, spec.key, spec.ref, tier2?.year)
  const lastYear = data.length ? data[data.length - 1].year : null
  return (
    <figure className="sb-chart" aria-label={`${spec.titre} (${spec.unite})`}>
      <figcaption>{spec.titre} <span className="sb-muted">({spec.unite})</span></figcaption>
      <ResponsiveContainer width="100%" height={230}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={tick} minTickGap={24} />
          <YAxis tick={tick} width={44} tickFormatter={(v) => fmt(v, spec.tickDec ?? (spec.dec === 1 ? 0 : 1))} domain={domain ?? ['auto', 'auto']} allowDataOverflow={domain !== null} />
          <Tooltip formatter={(v) => `${fmt(v, spec.dec)} ${tooltipUnit(spec)}`.trim()} labelFormatter={(y) => `Année ${y}`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {tier2 && lastYear > tier2.year && <ReferenceArea x1={tier2.year} x2={lastYear} fill="#9e9e9e" fillOpacity={0.12} stroke="none" ifOverflow="hidden" label={{ value: 'Hors expérience', position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' }} />}
          {spec.id === 'debt' && <ReferenceLine y={W.tier1DebtPct} stroke="#bf4000" strokeDasharray="2 4" ifOverflow="hidden" label={{ value: `${W.tier1DebtPct} % (record du Japon)`, position: 'insideBottomLeft', fontSize: 10, fill: '#bf4000' }} />}
          {spec.id === 'debt' && tier1 && <ReferenceLine x={tier1.year} stroke="#bf4000" strokeDasharray="2 4" label={{ value: `${tier1.year}`, position: 'insideTopLeft', fontSize: 10, fill: '#bf4000' }} />}
          {tier2 && <ReferenceLine x={tier2.year} stroke="#b71c1c" strokeWidth={1.5} label={spec.id === 'debt' ? { value: `${tier2.year} : hors expérience`, position: 'insideTopLeft', fontSize: 10, fill: '#b71c1c' } : undefined} />}
          <Line type="monotone" dataKey={spec.key} name="Scénario" stroke="#5c6bc0" strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />
          {beyond && <Line type="monotone" dataKey={beyond} name="Scénario (hors expérience)" stroke="#9e9e9e" strokeWidth={2} strokeDasharray="1 4" dot={false} connectNulls={false} isAnimationActive={false} />}
          <Line type="monotone" dataKey={spec.ref} name="Référence (sans levier)" stroke="#6b6b6b" strokeWidth={1.75} strokeDasharray="5 4" dot={false} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  )
}

export default function Charts({ data, tier1 = null, tier2 = null }) {
  const shown = splitSeriesAtYear(data, tier2?.year)
  return (
    <section className="sb-section" aria-labelledby="sb-graphiques">
      <h2 id="sb-graphiques">Trajectoires</h2>
      <p className="sb-help">Trait plein : votre scénario. Pointillés longs : la référence, sans aucun levier.{tier2 && ' Trait gris pointillé : trajectoire hors de toute expérience historique (le modèle ne décrit plus une situation réaliste) ; l\'axe vertical l\'ignore, les valeurs restent lisibles au survol et dans l\'export CSV.'}</p>
      <div className="sb-charts">
        {CHARTS.map((c) => <SimpleChart key={c.id} spec={c} data={shown} tier1={tier1} tier2={tier2} />)}
      </div>
    </section>
  )
}
