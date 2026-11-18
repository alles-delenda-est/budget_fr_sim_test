export default function SliderControl({ label, value, onChange, min, max, step, unit, help, decimals = 0 }) {
  const safeValue = value ?? 0
  const inputId = `slider-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`

  return (
    <div className="control">
      <div className="control-header">
        <label htmlFor={inputId}>{label}</label>
        <span className="control-value">
          {safeValue.toFixed(decimals)} {unit}
        </span>
      </div>
      <input
        id={inputId}
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
