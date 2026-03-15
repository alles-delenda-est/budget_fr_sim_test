import './Navigation.css'

const TABS = [
  { id: 'intro', label: 'Introduction' },
  { id: 'budget', label: 'Simulateur Budget' },
  { id: 'retraites', label: 'Simulateur Retraites' },
  { id: 'hypotheses', label: 'Hypothèses & Paramètres' },
]

export default function Navigation({ currentPage, navigateTo }) {
  return (
    <nav className="nav-tabs" role="tablist" aria-label="Navigation principale">
      {TABS.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={currentPage === tab.id}
          className={`nav-tab ${currentPage === tab.id ? 'active' : ''}`}
          onClick={() => navigateTo(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
