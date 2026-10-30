import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Fills a page's search box from ?search=… in the address, so a top-bar search result
 * opens the right list already filtered (also when that page is already open).
 */
export function useSearchFromUrl(setSearch: (value: string) => void): void {
  const { search } = useLocation()
  useEffect(() => {
    const value = new URLSearchParams(search).get('search')
    if (value !== null) setSearch(value)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps
}
