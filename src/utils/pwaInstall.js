const VISIT_KEY    = 'surprix_pwa_visits'
const DISMISS_KEY  = 'surprix_pwa_dismissed'
const SHOW_AFTER   = 3
const DISMISS_DAYS = 30

export const isIosSafari = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) &&
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent) &&
  !window.navigator.standalone

export const incrementVisit = () => {
  const n = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1
  localStorage.setItem(VISIT_KEY, String(n))
  return n
}

export const getVisits = () =>
  parseInt(localStorage.getItem(VISIT_KEY) || '0', 10)

export const isDismissed = () => {
  const ts = localStorage.getItem(DISMISS_KEY)
  if (!ts) return false
  return (Date.now() - parseInt(ts, 10)) < DISMISS_DAYS * 86_400_000
}

export const dismissPwa = () =>
  localStorage.setItem(DISMISS_KEY, String(Date.now()))

export const shouldShowPwa = () =>
  isIosSafari() && getVisits() >= SHOW_AFTER && !isDismissed() &&
  localStorage.getItem('surprix_cookie_consent') !== null
