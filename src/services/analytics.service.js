const MEASUREMENT_ID = 'G-Q4MTR6C5MV'
const DEBUG = import.meta.env.DEV

const track = (name, params) => {
  try {
    if (typeof window.gtag === 'function') window.gtag('event', name, { ...params, debug_mode: DEBUG })
  } catch {}
}

const pathToTitle = (pathname) => {
  if (pathname === '/missing') return 'Mancanti'
  if (pathname === '/doubles') return 'Doppi'
  if (pathname === '/catalog') return 'Catalogo'
  if (pathname === '/profile') return 'Profilo'
  if (pathname === '/search') return 'Ricerca'
  if (/^\/missing-owners\//.test(pathname)) return 'Scambi'
  if (/^\/other-for-you\//.test(pathname)) return 'Offerte per te'
  if (/^\/catalog\/[^/]+\/[^/]+\/[^/]+$/.test(pathname)) return 'Sorprese'
  if (/^\/catalog\/[^/]+\/[^/]+$/.test(pathname)) return 'Serie'
  if (/^\/catalog\/[^/]+$/.test(pathname)) return 'Anni'
  return pathname
}

export const trackPage = (pathname) => {
  track('page_view', {
    page_title: pathToTitle(pathname),
    page_location: window.location.href,
    page_path: pathname,
  })
}

export const trackToggleMissing = (action)        => track('toggle_missing', { action })
export const trackToggleDoubles = (action)         => track('toggle_doubles', { action })
export const trackAddAllMissing = (count)          => track('add_all_missing', { count })
export const trackUndo          = ()               => track('use_undo')
export const trackLightbox      = ()               => track('open_lightbox')
export const trackSelectMode    = (page)           => track('enter_select_mode', { page })
export const trackAddSelected   = (count, page)    => track('confirm_add_selected', { count, page })
export const trackSearch        = (page)           => track('use_search', { page })
export const trackFilter        = (page)           => track('use_filter', { page })
export const trackTradeEmail    = (itemCount)      => track('send_trade_email', { item_count: itemCount })
