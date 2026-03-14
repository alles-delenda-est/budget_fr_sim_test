export default function SliderControl({ label, value, onChange, min, max, step, unit, help, decimals = 0 }) {
  const safeValue = value ?? 0

  return (
    <div className="control">
      <div className="control-header">
        <label>{label}</label>
        <span className="control-value">
          {safeValue.toFixed(decimals)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider"
      />
      {help && <p className="control-help">{help}</p>}
    </div>
  )
}
