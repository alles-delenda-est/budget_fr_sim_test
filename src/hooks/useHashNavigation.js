import { useState, useEffect, useCallback } from 'react'

const PAGES = new Set(['intro', 'budget', 'retraites', 'hypotheses'])

function parseHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return PAGES.has(hash) ? hash : 'budget'
}

export default function useHashNavigation(defaultPage = 'budget') {
  const [currentPage, setCurrentPage] = useState(() => {
    if (!window.location.hash) return defaultPage
    return parseHash()
  })

  useEffect(() => {
    const onHashChange = () => setCurrentPage(parseHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigateTo = useCallback((page) => {
    if (!PAGES.has(page)) {
      console.warn(`useHashNavigation: unknown page "${page}"`)
      return
    }
    window.location.hash = `#/${page}`
  }, [])

  return { currentPage, navigateTo }
}
