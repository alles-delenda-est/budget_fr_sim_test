import { Component } from 'react'

/**
 * Filet de sécurité React : capture les erreurs d'exécution ou de chargement de module
 * et propose une récupération propre sans écran blanc.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ? String(error.message) : '' }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('Erreur capturée par ErrorBoundary :', error, info?.componentStack)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <section className="error-fallback" role="alert">
        <h2>Une erreur inattendue est survenue</h2>
        <p>
          L&apos;affichage de cette vue a rencontré un incident technique. Vos paramètres initiaux n&apos;ont pas été envoyés à un serveur : tout s&apos;exécute dans votre navigateur.
        </p>
        {this.state.message && (
          <p className="error-fallback-detail">
            Détail : <code>{this.state.message.slice(0, 180)}</code>
          </p>
        )}
        <div className="error-fallback-actions">
          <button type="button" className="sb-btn" onClick={() => window.location.reload()}>
            Recharger la page
          </button>
          <button
            type="button"
            className="sb-btn"
            onClick={() => {
              window.location.hash = '#/budget'
              window.location.reload()
            }}
          >
            Revenir au simulateur budgétaire
          </button>
        </div>
      </section>
    )
  }
}
