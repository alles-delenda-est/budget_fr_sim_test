/* src/components/TaxSlider.jsx */
/* Reusable slider component for tax rates */

import { formatNumber } from '../utils/calculations';
import './TaxSlider.css';

function TaxSlider({ config, value, onChange, revenue }) {
  const {
    id,
    name,
    shortName,
    description,
    minRate,
    maxRate,
    step,
    baselineRate,
    tooltipFr,
    employmentSensitive,
  } = config;
  
  // Calculate percentage change from baseline
  const changeFromBaseline = value - baselineRate;
  const isIncreased = changeFromBaseline > 0.001;
  const isDecreased = changeFromBaseline < -0.001;
  
  return (
    <div className={`tax-slider ${employmentSensitive ? 'employment-sensitive' : ''}`}>
      <div className="slider-header">
        <div className="slider-title">
          <h4>{shortName || name}</h4>
          {employmentSensitive && (
            <span className="employment-badge" title="Sensible à l'emploi">
              ⚠️ Emploi
            </span>
          )}
        </div>
        <div className="slider-value">
          <span className="rate-value">{formatNumber(value, 'percent')}</span>
          {(isIncreased || isDecreased) && (
            <span className={`rate-change ${isIncreased ? 'increased' : 'decreased'}`}>
              {isIncreased ? '↑' : '↓'} {formatNumber(Math.abs(changeFromBaseline), 'percent')}
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
          id={`tax-${id}`}
          min={minRate}
          max={maxRate}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={name}
        />
        <div className="slider-marks">
          <span>{formatNumber(minRate, 'percent')}</span>
          <span className="baseline-mark" title="Taux de référence PLF 2025">
            Base: {formatNumber(baselineRate, 'percent')}
          </span>
          <span>{formatNumber(maxRate, 'percent')}</span>
        </div>
      </div>
      
      <div className="slider-revenue">
        <span className="revenue-label">Recettes estimées:</span>
        <span className="revenue-value">{formatNumber(revenue, 'billions')}</span>
      </div>
      
      {tooltipFr && (
        <details className="slider-tooltip">
          <summary>En savoir plus</summary>
          <p>{tooltipFr}</p>
        </details>
      )}
    </div>
  );
}

export default TaxSlider;
