import { memo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts'
import { WARNING_THRESHOLDS as W } from '../../config'
import { fmt, niceAxis, FISCAL_BENCHMARKS } from './helpers'
import { splitSeriesAtYear, chartYDomain } from './warnings'

const CHARTS = [
  { id: 'debt', titre: 'Dette publique', unite: '% du PIB', key: 'debt', ref: 'debtRef', centralRef: 'debtCentralRef', pin: 'debtPin', dec: 1, higherIsBetter: false },
  { id: 'balance', titre: 'Solde public', unite: '% du PIB', key: 'balance', ref: 'balanceRef', centralRef: 'balanceCentralRef', pin: 'balancePin', dec: 2, higherIsBetter: true },
  { id: 'interest', titre: 'Charge d\'intérêts', unite: '% du PIB', key: 'interest', ref: 'interestRef', centralRef: 'interestCentralRef', pin: 'interestPin', dec: 2, higherIsBetter: false },
  { id: 'gdp', titre: 'Écart de PIB à la référence', unite: '%', key: 'gdpGap', ref: 'gdpGapRef', centralRef: 'gdpGapCentralRef', pin: 'gdpGapPin', dec: 2, higherIsBetter: true },
  { id: 'unemployment', titre: 'Chômage', unite: '% de la population active', key: 'unemployment', ref: 'unemploymentRef', centralRef: 'unemploymentCentralRef', pin: 'unemploymentPin', dec: 1, tickDec: 1, higherIsBetter: false },
]

/** Unité affichée dans l'infobulle : « % du PIB » tel quel, « % » pour les autres séries en pourcentage. */
const tooltipUnit = (spec) => (spec.unite.startsWith('% du PIB') ? spec.unite : '%')

/** Minimum et maximum à représenter : bornes du palier 2 si elles existent, sinon toutes les valeurs finies (avec inclusion du repère UE −3 % sur le solde public). */
function extent(data, spec, domain, showBand = false, hasPin = false, hasStressTest = false) {
  let base = domain
  if (!base) {
    const vals = data.flatMap((r) => {
      const list = [r[spec.key], r[spec.ref]]
      if (hasStressTest && spec.centralRef) list.push(r[spec.centralRef])
      if (hasPin && spec.pin) list.push(r[spec.pin])
      if (showBand && Array.isArray(r[`${spec.key}Band`])) list.push(...r[`${spec.key}Band`])
      return list
    }).filter(Number.isFinite)
    base = vals.length ? [Math.min(...vals), Math.max(...vals)] : [NaN, NaN]
  }
  if (spec.id === 'balance' && Number.isFinite(base[0]) && Number.isFinite(base[1])) {
    return [base[0], Math.max(base[1], FISCAL_BENCHMARKS.maastrichtDeficitPct + 0.5)]
  }
  return base
}

function formatTooltipEntry(v, name, item, spec) {
  const u = tooltipUnit(spec)
  if (Array.isArray(v)) {
    const [lo, hi] = v
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || Math.abs(hi - lo) < 0.005) return null
    const row = item?.payload
    const vBas = row?.[`${spec.key}Bas`]
    const vHaut = row?.[`${spec.key}Haut`]
    let loTag = ''
    let hiTag = ''
    if (Number.isFinite(vBas) && Number.isFinite(vHaut)) {
      if (vHaut >= vBas) {
        loTag = ' (bas)'
        hiTag = ' (haut)'
      } else {
        loTag = ' (haut)'
        hiTag = ' (bas)'
      }
    }
    return [`${fmt(lo, spec.dec)}${loTag} à ${fmt(hi, spec.dec)} ${u}${hiTag}`.trim(), name]
  }
  if (!Number.isFinite(v)) return null
  return [`${fmt(v, spec.dec)} ${u}`.trim(), name]
}

const shortPinName = (lbl) => {
  const s = String(lbl ?? 'Scénario A').trim() || 'Scénario A'
  return s.length > 22 ? `${s.slice(0, 21)}…` : s
}

function SimpleChart({ spec, data, tier1, tier2, showBand, bandTier2Year, pinnedLabel, tier2A, hasStressTest }) {
  const tick = { fontSize: 11 }
  const hasPin = Boolean(pinnedLabel)
  const beyond = tier2 ? `${spec.key}Beyond` : null
  const beyondPin = hasPin && tier2A ? `${spec.pin}Beyond` : null
  // Après le palier 2, le trait du scénario est grisé et pointillé ; l'axe vertical ignore cette partie pour ne pas écraser les autres courbes.
  const domain = chartYDomain(data, spec, {
    tier2Year: tier2?.year ?? null,
    bandTier2Year: showBand ? bandTier2Year : null,
    tier2YearA: hasPin ? (tier2A?.year ?? null) : null,
  })
  // Graduations rondes sur l'axe de la dette, du solde public (repère −3 % toujours visible) et sur tout graphique borné par le palier 2.
  const nice = (domain !== null || spec.id === 'debt' || spec.id === 'balance')
    ? niceAxis(...extent(data, spec, domain, showBand, hasPin, hasStressTest), { minStep: spec.id === 'debt' ? 10 : 1 })
    : null
  const firstYear = data.length ? data[0].year : null
  const lastYear = data.length ? data[data.length - 1].year : null
  const showTier2Label = tier2 && lastYear > tier2.year && firstYear !== null && (lastYear - tier2.year) / Math.max(1, lastYear - firstYear) >= 0.22
  const maxDebt = spec.id === 'debt' ? Math.max(...data.flatMap((r) => [r[spec.key], r[spec.ref], hasStressTest ? r[spec.centralRef] : NaN, hasPin ? r[spec.pin] : NaN]).filter(Number.isFinite), 0) : 0
  return (
    <figure className="sb-chart" aria-label={`${spec.titre} (${spec.unite})`}>
      <figcaption>{spec.titre} <span className="sb-muted">({spec.unite})</span></figcaption>
      <ResponsiveContainer width="100%" height={tier2 || tier2A ? 255 : 230}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis dataKey="year" tick={tick} minTickGap={24} />
          <YAxis tick={tick} width={44} tickFormatter={(v) => fmt(v, spec.tickDec ?? (spec.dec === 1 ? 0 : 1))} domain={nice?.domain ?? domain ?? ['auto', 'auto']} ticks={nice?.ticks} allowDataOverflow={domain !== null || nice !== null} />
          <Tooltip
            formatter={(v, name, item) => formatTooltipEntry(v, name, item, spec)}
            labelFormatter={(y) => `Année ${y}`}
            contentStyle={{ whiteSpace: 'normal', maxWidth: 280, fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {tier2 && lastYear > tier2.year && <ReferenceArea x1={tier2.year} x2={lastYear} fill="#9e9e9e" fillOpacity={0.12} stroke="none" ifOverflow="hidden" label={showTier2Label ? { value: 'Hors expérience', position: 'insideTopRight', fontSize: 10, fill: '#6b6b6b' } : undefined} />}
          {spec.id === 'debt' && (tier1 || maxDebt >= 220) && <ReferenceLine y={W.tier1DebtPct} stroke="#bf4000" strokeDasharray="2 4" ifOverflow="hidden" label={{ value: `${W.tier1DebtPct} %`, position: 'insideBottomLeft', fontSize: 10, fill: '#bf4000' }} />}
          {spec.id === 'debt' && tier1 && <ReferenceLine x={tier1.year} stroke="#bf4000" strokeDasharray="2 4" />}
          {spec.id === 'balance' && (
            <ReferenceLine
              y={FISCAL_BENCHMARKS.maastrichtDeficitPct}
              stroke="#2e7d32"
              strokeOpacity={0.75}
              strokeWidth={1.25}
              strokeDasharray="4 3"
              ifOverflow="hidden"
              label={{ value: `Seuil UE ${fmt(FISCAL_BENCHMARKS.maastrichtDeficitPct, 0)} %`, position: 'insideTopLeft', fontSize: 10, fill: '#2e7d32' }}
            />
          )}
          {tier2 && <ReferenceLine x={tier2.year} stroke="#b71c1c" strokeWidth={1.5} />}
          {showBand && (
            <Area
              type="monotone"
              dataKey={`${spec.key}Band`}
              name="Fourchette d'offre (bas–haut)"
              fill="#5c6bc0"
              fillOpacity={0.15}
              stroke="#5c6bc0"
              strokeOpacity={0.32}
              strokeWidth={1}
              strokeDasharray="2 2"
              legendType="rect"
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line type="monotone" dataKey={spec.key} name={hasPin ? 'Scénario actif (B)' : 'Scénario'} stroke="#5c6bc0" strokeWidth={2.5} legendType="plainline" dot={false} connectNulls={false} isAnimationActive={false} />
          {beyond && <Line type="monotone" dataKey={beyond} name="Scénario (hors expérience)" stroke="#9e9e9e" strokeWidth={2} strokeDasharray="1 4" legendType="plainline" dot={false} connectNulls={false} isAnimationActive={false} />}
          {hasPin && (
            <Line
              type="monotone"
              dataKey={spec.pin}
              name={`Scénario A : ${shortPinName(pinnedLabel)}`}
              stroke="#00796b"
              strokeWidth={2.25}
              strokeDasharray="8 3 2 3"
              legendType="plainline"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          {beyondPin && (
            <Line
              type="monotone"
              dataKey={beyondPin}
              name="Scénario A (hors expérience)"
              stroke="#9e9e9e"
              strokeWidth={1.75}
              strokeDasharray="1 4"
              legendType="plainline"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Line type="monotone" dataKey={spec.ref} name={hasStressTest ? 'Référence sous choc (sans levier)' : 'Référence (sans levier)'} stroke="#6b6b6b" strokeWidth={1.75} strokeDasharray="5 4" legendType="plainline" dot={false} connectNulls={false} isAnimationActive={false} />
          {hasStressTest && (
            <Line type="monotone" dataKey={spec.centralRef} name="Référence centrale (hors choc)" stroke="#a3a3a3" strokeWidth={1.25} strokeDasharray="2 3" legendType="plainline" dot={false} connectNulls={false} isAnimationActive={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  )
}

const Charts = memo(function Charts({
  data,
  tier1 = null,
  tier2 = null,
  hasMacroOverride = false,
  hasStressTest = false,
  showBand = false,
  bandTier2Year = null,
  pinnedLabel = null,
  tier2A = null,
}) {
  const shown = splitSeriesAtYear(data, tier2?.year, pinnedLabel ? tier2A?.year : null)
  return (
    <section className="sb-section" aria-labelledby="sb-graphiques">
      <h2 id="sb-graphiques">Trajectoires</h2>
      <p className="sb-help">
        Trait plein : {pinnedLabel ? 'votre scénario actif (B)' : 'votre scénario'}.{' '}
        {pinnedLabel && 'Tiret-point vert foncé : scénario épinglé (A). '}
        {showBand && 'Zone ombrée : fourchette paramétrique déterministe des effets d\'offre (bas à haut, non probabiliste). '}
        Pointillés longs : {hasStressTest ? 'la référence sous le même choc, sans aucun levier.' : 'la référence, sans aucun levier.'}{' '}
        {hasStressTest && 'Pointillés fins gris clair : référence centrale hors choc. '}
        Tirets verts sur le solde public : seuil européen de {fmt(FISCAL_BENCHMARKS.maastrichtDeficitPct, 0)} % du PIB (Maastricht).
        {hasMacroOverride && ' Avec un comparateur macroéconomique actif, le graphique « Écart de PIB à la référence » isole l\'effet des seuls leviers budgétaires (yD + yS, soit 0,00 % sans levier) par rapport au PIB nominal du comparateur.'}
        {tier1 && ` Pointillé orangé : seuil de ${W.tier1DebtPct} % de dette (record du Japon) et année où il est franchi.`}
        {tier2 && ' Trait gris pointillé après la ligne rouge : trajectoire hors de toute expérience historique (le modèle ne décrit plus une situation réaliste) ; l\'axe vertical l\'ignore, les valeurs restent lisibles au survol et dans l\'export CSV.'}
      </p>
      <div className="sb-charts">
        {CHARTS.map((c) => (
          <SimpleChart
            key={c.id}
            spec={c}
            data={shown}
            tier1={tier1}
            tier2={tier2}
            showBand={showBand}
            bandTier2Year={bandTier2Year}
            pinnedLabel={pinnedLabel}
            tier2A={tier2A}
            hasStressTest={hasStressTest}
          />
        ))}
      </div>
    </section>
  )
})

export default Charts
