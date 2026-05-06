import { useEffect } from 'react'

const DEFAULTS = {
  title: 'Surprix',
  description: 'Tieni in ordine la tua collezione di sorprese. Segna i mancanti, i doppi e trova scambi con altri collezionisti.',
  url: 'https://surprix.app',
  type: 'website',
  twitterDescription: 'Tieni in ordine la tua collezione di sorprese.',
}

const setMeta = (selector, value) =>
  document.querySelector(selector)?.setAttribute('content', value)

export const usePageMeta = ({ title, description, url, type = 'website' } = {}) => {
  useEffect(() => {
    if (!title) return

    document.title = title
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description || DEFAULTS.description)
    setMeta('meta[property="og:url"]', url || DEFAULTS.url)
    setMeta('meta[property="og:type"]', type)
    setMeta('meta[name="description"]', description || DEFAULTS.description)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description || DEFAULTS.twitterDescription)

    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    if (url) canonical.href = url

    return () => {
      document.title = DEFAULTS.title
      setMeta('meta[property="og:title"]', DEFAULTS.title)
      setMeta('meta[property="og:description"]', DEFAULTS.description)
      setMeta('meta[property="og:url"]', DEFAULTS.url)
      setMeta('meta[property="og:type"]', 'website')
      setMeta('meta[name="description"]', DEFAULTS.description)
      setMeta('meta[name="twitter:title"]', DEFAULTS.title)
      setMeta('meta[name="twitter:description"]', DEFAULTS.twitterDescription)
      document.querySelector('link[rel="canonical"]')?.remove()
    }
  }, [title, description, url, type])
}
