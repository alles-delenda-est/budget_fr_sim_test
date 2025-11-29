/* src/components/ModeToggle.jsx */
/* Simple/Advanced mode toggle component */

import './ModeToggle.css';

function ModeToggle({ isAdvanced, onToggle }) {
  return (
    <div className="mode-toggle">
      <span className="mode-label">Mode:</span>
      <div className="toggle-buttons">
        <button
          className={`toggle-btn ${!isAdvanced ? 'active' : ''}`}
          onClick={() => onToggle(false)}
          aria-pressed={!isAdvanced}
        >
          Simple
        </button>
        <button
          className={`toggle-btn ${isAdvanced ? 'active' : ''}`}
          onClick={() => onToggle(true)}
          aria-pressed={isAdvanced}
        >
          Avancé
        </button>
      </div>
      <p className="mode-description">
        {isAdvanced 
          ? 'Contrôles détaillés avec cotisations patronales séparées par niveau de salaire'
          : 'Vue simplifiée avec les principaux leviers budgétaires'
        }
      </p>
    </div>
  );
}

export default ModeToggle;
