import { lazy, Suspense } from 'react'
import './App.css'
import useHashNavigation from './hooks/useHashNavigation'
import Navigation from './components/Navigation'
import ReviewBanner from './components/ReviewBanner'
import ErrorBoundary from './components/ErrorBoundary'
import { versionStamp } from './version'
import IntroPage from './pages/IntroPage'

const SimulateurBudgetPage = lazy(() => import('./pages/SimulateurBudgetPage'))
const SimulateurRetraitesPage = lazy(() => import('./pages/SimulateurRetraitesPage'))
const HypothesesPage = lazy(() => import('./pages/HypothesesPage'))

function App() {
  const { currentPage, navigateTo } = useHashNavigation('intro')

  return (
    <>
      <a className="skip-link" href="#main-content">Aller au contenu principal</a>
      <ReviewBanner />
      <div className="app">
        <header className="header">
          <h1>Simulateur Budget France <span className="version-badge">APU · 2026–2056</span></h1>
          <p className="subtitle">
            Administrations publiques consolidées : État et ODAC, sécurité sociale, collectivités locales &bull; effets de demande et d'offre explicites &bull; charge d'intérêts aux taux de marché
          </p>
        </header>

        <Navigation currentPage={currentPage} navigateTo={navigateTo} />

        <main id="main-content" className="main-content" tabIndex={-1}>
          <ErrorBoundary>
            <Suspense fallback={<div className="sb-help" role="status">Chargement de la page…</div>}>
              {currentPage === 'intro' && <IntroPage navigateTo={navigateTo} />}
              {currentPage === 'budget' && <SimulateurBudgetPage />}
              {currentPage === 'retraites' && <SimulateurRetraitesPage />}
              {currentPage === 'hypotheses' && <HypothesesPage />}
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className="footer">
          <p>
            Simulateur Budget France &bull; Sources : Insee (comptes 2025), RESF 2027, AFT (2026), COR (juin 2026), Cour des comptes, Commission européenne, OCDE, Banque de France, Unédic, DG Trésor, FIPECO.
          </p>
          <p className="footer-note footer-version">{versionStamp()} — version pré-publication</p>
          <p className="footer-note">
            Administrations publiques consolidées : État et ODAC, sécurité sociale, collectivités locales &bull; effets de demande et d'offre explicites, avertissements hors expérience historique.
          </p>
        </footer>
      </div>
    </>
  )
}

export default App
