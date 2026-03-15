import './App.css'
import useHashNavigation from './hooks/useHashNavigation'
import Navigation from './components/Navigation'
import IntroPage from './pages/IntroPage'
import SimulateurBudgetPage from './pages/SimulateurBudgetPage'
import SimulateurRetraitesPage from './pages/SimulateurRetraitesPage'
import HypothesesPage from './pages/HypothesesPage'

function App() {
  const { currentPage, navigateTo } = useHashNavigation('intro')

  return (
    <div className="app">
      <header className="header">
        <h1>Simulateur Budget France <span className="version-badge">v2.0</span></h1>
        <p className="subtitle">
          Vue intégrée État + Sécurité Sociale (APU totales) &bull; Réponse comportementale ETI &bull; Inertie dette
        </p>
      </header>

      <Navigation currentPage={currentPage} navigateTo={navigateTo} />

      <main className="main-content">
        {currentPage === 'intro' && <IntroPage navigateTo={navigateTo} />}
        {currentPage === 'budget' && <SimulateurBudgetPage />}
        {currentPage === 'retraites' && <SimulateurRetraitesPage />}
        {currentPage === 'hypotheses' && <HypothesesPage />}
      </main>

      <footer className="footer">
        <p>Simulateur Budget France v2.0 &bull; Sources : PLF 2025, PLFSS 2026, FMI, OCDE, BCE, AFT</p>
        <p className="footer-note">
          Vue consolidée État + Sécurité Sociale. Réponse comportementale ETI. Inertie taux OAT.
        </p>
      </footer>
    </div>
  )
}

export default App
