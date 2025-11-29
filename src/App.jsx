import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'
import './App.css'

/**
 * FRENCH BUDGET SIMULATOR - Test Version with Pension Controls
 * 
 * Pedagogical tool to understand French fiscal trade-offs
 * Data sources: PLF 2025, PLFSS 2025/2026, Generation Libre contre-budget
 * 
 * PENSION ADJUSTMENT LEVER:
 * Combines two distinct policy mechanisms:
 * 1. Indexation changes (gel, sous-indexation) - affects pension amounts
 * 2. Tax treatment changes (abatement removal) - affects pension taxation
 * Both generate budget savings but through different channels.
 */

// =============================================================================
// BASELINE DATA (2025)
// =============================================================================

const BASELINE = {
  // Revenue (Md€)
  revenuTotal: 308.4,        // PLF 2025 recettes nettes
  incomeTax: 94.1,           // IR
  vat: 97.5,                 // TVA (State share)
  corporateTax: 51.3,        // IS
  otherTax: 65.5,            // Other taxes
  
  // Expenditure (Md€) - Top missions
  spendingTotal: 444.97,     // PLF 2025 charges nettes
  education: 88.9,           // Enseignement scolaire
  defense: 65.0,             // Defense
  solidarity: 30.0,          // Solidarite, insertion
  ecological: 45.0,          // Ecologie, développement
  otherSpending: 216.07,     // Remaining missions
  
  // Social Security context (for pension lever)
  pensionSpending: 336.0,    // ~43% of SS expenditure (~780 Md€)
  
  // Deficit
  deficit: -139.0,           // PLF 2025 target
}

// =============================================================================
// POLICY REFERENCE POINTS (for pedagogical markers)
// =============================================================================

const PENSION_REFERENCES = {
  gel_2025: { 
    savings: 3.6, 
    label: "PLFSS 2025: Report revalorisation Jan→Jul",
    shortLabel: "Report 6 mois"
  },
  gel_2026: { 
    savings: 3.7, 
    label: "PLFSS 2026: Gel total (0% indexation)",
    shortLabel: "Gel total"
  },
  abattement: { 
    savings: 4.5, 
    label: "Generation Libre: Suppression abattement 10%",
    shortLabel: "Fin abattement 10%"
  },
  combined: {
    savings: 8.2,
    label: "Gel + suppression abattement (cumul)",
    shortLabel: "Gel + abattement"
  }
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

function App() {
  // -------------------------------------------------------------------------
  // State: Tax adjustments (percentage point changes)
  // -------------------------------------------------------------------------
  const [incomeTaxChange, setIncomeTaxChange] = useState(0)      // -5 to +5 pp
  const [vatChange, setVatChange] = useState(0)                  // -2 to +2 pp
  const [corporateTaxChange, setCorporateTaxChange] = useState(0) // -5 to +5 pp
  
  // -------------------------------------------------------------------------
  // State: Spending adjustments (percentage changes)
  // -------------------------------------------------------------------------
  const [educationChange, setEducationChange] = useState(0)      // -20% to +20%
  const [defenseChange, setDefenseChange] = useState(0)          // -20% to +20%
  const [solidarityChange, setSolidarityChange] = useState(0)    // -20% to +20%
  
  // -------------------------------------------------------------------------
  // State: Pension adjustment (Md€ savings target)
  // -------------------------------------------------------------------------
  const [pensionSavings, setPensionSavings] = useState(0)        // 0 to 10 Md€

  // -------------------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------------------
  const calculations = useMemo(() => {
    // Revenue changes (simplified: 1pp change ≈ proportional revenue change)
    // In reality, behavioral responses would modify these - Phase 1 will add elasticities
    const newIncomeTax = BASELINE.incomeTax * (1 + incomeTaxChange / 14.4)  // ~14.4% effective rate
    const newVat = BASELINE.vat * (1 + vatChange / 20)                       // 20% standard rate
    const newCorporateTax = BASELINE.corporateTax * (1 + corporateTaxChange / 25) // 25% rate
    
    const totalRevenue = newIncomeTax + newVat + newCorporateTax + BASELINE.otherTax
    
    // Spending changes
    const newEducation = BASELINE.education * (1 + educationChange / 100)
    const newDefense = BASELINE.defense * (1 + defenseChange / 100)
    const newSolidarity = BASELINE.solidarity * (1 + solidarityChange / 100)
    
    const totalSpending = newEducation + newDefense + newSolidarity + 
                          BASELINE.ecological + BASELINE.otherSpending
    
    // Pension savings reduce the deficit directly
    // (In full model, would flow through SS accounts)
    const adjustedSpending = totalSpending - pensionSavings
    
    // New deficit
    const newDeficit = totalRevenue - adjustedSpending
    const deficitChange = newDeficit - BASELINE.deficit
    
    return {
      revenue: {
        incomeTax: newIncomeTax,
        vat: newVat,
        corporateTax: newCorporateTax,
        other: BASELINE.otherTax,
        total: totalRevenue,
      },
      spending: {
        education: newEducation,
        defense: newDefense,
        solidarity: newSolidarity,
        ecological: BASELINE.ecological,
        other: BASELINE.otherSpending,
        pensionSavings: pensionSavings,
        total: adjustedSpending,
      },
      deficit: newDeficit,
      deficitChange: deficitChange,
    }
  }, [incomeTaxChange, vatChange, corporateTaxChange, 
      educationChange, defenseChange, solidarityChange, pensionSavings])

  // -------------------------------------------------------------------------
  // Chart data
  // -------------------------------------------------------------------------
  const chartData = [
    {
      name: 'Recettes',
      'IR': calculations.revenue.incomeTax,
      'TVA': calculations.revenue.vat,
      'IS': calculations.revenue.corporateTax,
      'Autres': calculations.revenue.other,
    },
    {
      name: 'Dépenses',
      'Éducation': calculations.spending.education,
      'Defense': calculations.spending.defense,
      'Solidarite': calculations.spending.solidarity,
      'Ecologie': calculations.spending.ecological,
      'Autres': calculations.spending.other,
    },
  ]

  // -------------------------------------------------------------------------
  // Helper: Find nearest policy reference for pension slider
  // -------------------------------------------------------------------------
  const getNearestPolicyReference = (value) => {
    if (value < 1) return null
    const refs = Object.values(PENSION_REFERENCES)
    let nearest = refs[0]
    let minDist = Math.abs(value - nearest.savings)
    
    for (const ref of refs) {
      const dist = Math.abs(value - ref.savings)
      if (dist < minDist) {
        minDist = dist
        nearest = ref
      }
    }
    return minDist < 1 ? nearest : null
  }

  const nearestPensionRef = getNearestPolicyReference(pensionSavings)

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="app">
      <header className="header">
        <h1>🇫🇷 Simulateur Budget France</h1>
        <p className="subtitle">Version test — Explorez les arbitrages budgétaires</p>
      </header>

      <main className="main">
        {/* Deficit Summary */}
        <section className="deficit-summary">
          <div className={`deficit-card ${calculations.deficitChange > 0 ? 'improved' : calculations.deficitChange < 0 ? 'worsened' : ''}`}>
            <h2>Solde budgétaire</h2>
            <div className="deficit-value">
              {calculations.deficit.toFixed(1)} Md€
            </div>
            <div className="deficit-change">
              {calculations.deficitChange > 0 ? '+' : ''}{calculations.deficitChange.toFixed(1)} Md€ vs référence
            </div>
            <div className="deficit-baseline">
              (Référence PLF 2025: {BASELINE.deficit} Md€)
            </div>
          </div>
        </section>

        <div className="controls-and-chart">
          {/* Controls Panel */}
          <section className="controls">
            {/* Tax Controls */}
            <div className="control-group">
              <h3>📊 Recettes fiscales</h3>
              
              <div className="slider-control">
                <label>
                  Impôt sur le revenu: {incomeTaxChange > 0 ? '+' : ''}{incomeTaxChange} pts
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={incomeTaxChange}
                  onChange={(e) => setIncomeTaxChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-5</span>
                  <span>0</span>
                  <span>+5</span>
                </span>
              </div>

              <div className="slider-control">
                <label>
                  TVA: {vatChange > 0 ? '+' : ''}{vatChange} pts
                </label>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.5"
                  value={vatChange}
                  onChange={(e) => setVatChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-2</span>
                  <span>0</span>
                  <span>+2</span>
                </span>
              </div>

              <div className="slider-control">
                <label>
                  Impôt sur les sociétés: {corporateTaxChange > 0 ? '+' : ''}{corporateTaxChange} pts
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={corporateTaxChange}
                  onChange={(e) => setCorporateTaxChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-5</span>
                  <span>0</span>
                  <span>+5</span>
                </span>
              </div>
            </div>

            {/* Spending Controls */}
            <div className="control-group">
              <h3>💰 Dépenses de l'État</h3>
              
              <div className="slider-control">
                <label>
                  Éducation: {educationChange > 0 ? '+' : ''}{educationChange}%
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={educationChange}
                  onChange={(e) => setEducationChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-20%</span>
                  <span>0</span>
                  <span>+20%</span>
                </span>
              </div>

              <div className="slider-control">
                <label>
                  Defense: {defenseChange > 0 ? '+' : ''}{defenseChange}%
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={defenseChange}
                  onChange={(e) => setDefenseChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-20%</span>
                  <span>0</span>
                  <span>+20%</span>
                </span>
              </div>

              <div className="slider-control">
                <label>
                  Solidarite: {solidarityChange > 0 ? '+' : ''}{solidarityChange}%
                </label>
                <input
                  type="range"
                  min="-20"
                  max="20"
                  step="1"
                  value={solidarityChange}
                  onChange={(e) => setSolidarityChange(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>-20%</span>
                  <span>0</span>
                  <span>+20%</span>
                </span>
              </div>
            </div>

            {/* Pension Controls - NEW */}
            <div className="control-group pension-control">
              <h3>👴 Retraites</h3>
              
              <div className="slider-control">
                <label>
                  Économies sur les retraites: {pensionSavings.toFixed(1)} Md€
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={pensionSavings}
                  onChange={(e) => setPensionSavings(parseFloat(e.target.value))}
                />
                <span className="slider-labels">
                  <span>0</span>
                  <span>5 Md€</span>
                  <span>10 Md€</span>
                </span>
              </div>

              {/* Policy Reference Markers */}
              <div className="policy-references">
                <p className="reference-title">Repères (économies annuelles) :</p>
                <ul className="reference-list">
                  <li className={pensionSavings >= 3.5 && pensionSavings < 4.0 ? 'active' : ''}>
                    <span className="ref-value">~3.6 Md€</span>
                    <span className="ref-label">Report revalorisation 6 mois (PLFSS 2025)</span>
                  </li>
                  <li className={pensionSavings >= 3.6 && pensionSavings < 4.2 ? 'active' : ''}>
                    <span className="ref-value">~3.7 Md€</span>
                    <span className="ref-label">Gel total des pensions (PLFSS 2026)</span>
                  </li>
                  <li className={pensionSavings >= 4.2 && pensionSavings < 5.0 ? 'active' : ''}>
                    <span className="ref-value">~4.5 Md€</span>
                    <span className="ref-label">Suppression abattement 10% (Generation Libre)</span>
                  </li>
                  <li className={pensionSavings >= 7.5 ? 'active' : ''}>
                    <span className="ref-value">~8.2 Md€</span>
                    <span className="ref-label">Gel + suppression abattement (cumul)</span>
                  </li>
                </ul>
                <p className="reference-note">
                  💡 Ces économies peuvent provenir de l'indexation (gel, sous-revalorisation) 
                  ou de la fiscalité (abattement IR). Mécanismes distincts, effet budgétaire similaire.
                </p>
              </div>
            </div>
          </section>

          {/* Chart */}
          <section className="chart-section">
            <h3>Recettes vs Dépenses (Md€)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 500]} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip formatter={(value) => `${value.toFixed(1)} Md€`} />
                <Legend />
                <Bar dataKey="IR" stackId="a" fill="#3b82f6" name="IR" />
                <Bar dataKey="TVA" stackId="a" fill="#10b981" name="TVA" />
                <Bar dataKey="IS" stackId="a" fill="#f59e0b" name="IS" />
                <Bar dataKey="Autres" stackId="a" fill="#6b7280" name="Autres recettes" />
                <Bar dataKey="Éducation" stackId="a" fill="#ef4444" name="Éducation" />
                <Bar dataKey="Defense" stackId="a" fill="#8b5cf6" name="Defense" />
                <Bar dataKey="Solidarite" stackId="a" fill="#ec4899" name="Solidarite" />
                <Bar dataKey="Ecologie" stackId="a" fill="#14b8a6" name="Ecologie" />
                <Bar dataKey="Autres" stackId="a" fill="#9ca3af" name="Autres dépenses" />
              </BarChart>
            </ResponsiveContainer>
            
            {/* Pension savings indicator */}
            {pensionSavings > 0 && (
              <div className="pension-savings-indicator">
                <span className="savings-badge">
                  💰 Économies retraites: -{pensionSavings.toFixed(1)} Md€
                </span>
                {nearestPensionRef && (
                  <span className="policy-match">
                    ≈ {nearestPensionRef.shortLabel}
                  </span>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Data Sources */}
        <section className="sources">
          <h4>Sources</h4>
          <ul>
            <li>PLF 2025 — Projet de Loi de Finances 2025</li>
            <li>PLFSS 2025/2026 — Projets de Loi de Financement de la Sécurité Sociale</li>
            <li>Generation Libre — Contre-budget libéral 2026 (39 mesures)</li>
            <li>IPP — Institut des Politiques Publiques (chiffrages "année blanche")</li>
          </ul>
          <p className="disclaimer">
            ⚠️ Version test simplifiee. Les effets comportementaux (elasticites) 
            seront integres dans la version complète.
          </p>
        </section>
      </main>

      <footer className="footer">
        <p>Simulateur pedagogique — Données PLF/PLFSS 2025-2026</p>
      </footer>
    </div>
  )
}

export default App