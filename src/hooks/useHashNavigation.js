import { useState, useEffect, useCallback } from 'react'

const PAGES = new Set(['intro', 'budget', 'retraites', 'hypotheses'])

function parseHash(defaultPage) {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return PAGES.has(hash) ? hash : defaultPage
}

export default function useHashNavigation(defaultPage = 'intro') {
  const [currentPage, setCurrentPage] = useState(() => {
    if (!window.location.hash) return defaultPage
    return parseHash(defaultPage)
  })

  useEffect(() => {
    const onHashChange = () => setCurrentPage(parseHash(defaultPage))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [defaultPage])

  const navigateTo = useCallback((page) => {
    if (!PAGES.has(page)) {
      console.warn(`useHashNavigation: unknown page "${page}"`)
      return
    }
    window.location.hash = `#/${page}`
  }, [])

  return { currentPage, navigateTo }
}
