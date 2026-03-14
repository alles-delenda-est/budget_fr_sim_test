export default function MetricCard({ label, value, unit, baseline, format, decimals = 1 }) {
  const safeValue = value ?? 0
  const safeBaseline = baseline ?? 0
  const delta = safeValue - safeBaseline
  const deltaPercent = safeBaseline !== 0 ? (delta / Math.abs(safeBaseline)) * 100 : 0

  let deltaClass = ''
  if (format === 'billions') {
    deltaClass = delta < 0 ? 'metric-better' : (delta > 0 ? 'metric-worse' : '')
  } else if (format === 'percent') {
    deltaClass = delta < 0 ? 'metric-better' : (delta > 0 ? 'metric-worse' : '')
  }

  const isNegativeValue = safeValue < 0

  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${isNegativeValue ? 'negative' : ''}`}>
        {safeValue.toFixed(decimals)} {unit}
      </div>
      <div className={`metric-diff ${deltaClass}`}>
        {delta > 0 ? '+' : ''}{delta.toFixed(decimals)} {unit}
        {' '}({delta > 0 ? '+' : ''}{deltaPercent.toFixed(1)}%)
      </div>
    </div>
  )
}
