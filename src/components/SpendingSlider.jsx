/* src/components/SpendingSlider.jsx */
/* Reusable slider component for spending categories */

import { formatNumber } from '../utils/calculations';
import './SpendingSlider.css';

function SpendingSlider({ config, value, onChange }) {
  const {
    id,
    name,
    shortName,
    description,
    min,
    max,
    step,
    baseline,
    adjustability,
    tooltipFr,
  } = config;
  
  // Calculate change from baseline
  const changeFromBaseline = value - baseline;
  const isIncreased = changeFromBaseline > 0.5;
  const isDecreased = changeFromBaseline < -0.5;
  const percentChange = ((value - baseline) / baseline) * 100;
  
  // Adjustability indicator
  const adjustabilityLabel = {
    high: { text: 'Facilement ajustable', color: 'var(--surplus-green)' },
    medium: { text: 'Ajustable avec contraintes', color: 'var(--warning-orange)' },
    low: { text: 'Difficilement ajustable', color: 'var(--deficit-red)' },
  };
  
  return (
    <div className={`spending-slider adjustability-${adjustability}`}>
      <div className="slider-header">
        <div className="slider-title">
          <h4>{shortName || name}</h4>
          <span 
            className="adjustability-indicator"
            style={{ color: adjustabilityLabel[adjustability].color }}
            title={adjustabilityLabel[adjustability].text}
          >
            {adjustability === 'high' && '●●●'}
            {adjustability === 'medium' && '●●○'}
            {adjustability === 'low' && '●○○'}
          </span>
        </div>
        <div className="slider-value">
          <span className="amount-value">{formatNumber(value, 'billions')}</span>
          {(isIncreased || isDecreased) && (
            <span className={`amount-change ${isIncreased ? 'increased' : 'decreased'}`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      
      <div className="slider-description">
        {description}
      </div>
      
      <div className="slider-control">
        <input
          type="range"
          id={`spending-${id}`}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={name}
        />
        <div className="slider-marks">
          <span>{formatNumber(min, 'billions')}</span>
          <span className="baseline-mark" title="Niveau PLF 2025">
            Base: {formatNumber(baseline, 'billions')}
          </span>
          <span>{formatNumber(max, 'billions')}</span>
        </div>
      </div>
      
      {tooltipFr && (
        <details className="slider-tooltip">
          <summary>En savoir plus</summary>
          <p>{tooltipFr}</p>
          <p className="adjustability-note">
            <strong>Ajustabilité:</strong> {adjustabilityLabel[adjustability].text}
          </p>
        </details>
      )}
    </div>
  );
}

export default SpendingSlider;
