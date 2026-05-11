const KEY = 'surprix_cookie_consent'
const GA_ID = 'G-Q4MTR6C5MV'

export const getConsent = () => localStorage.getItem(KEY)

export const setConsent = (value) => localStorage.setItem(KEY, value)

export const injectGA4 = () => {
  if (document.getElementById('ga4-script')) return
  window.dataLayer = window.dataLayer || []
  window.gtag = function () { window.dataLayer.push(arguments) }
  window.gtag('js', new Date())
  window.gtag('config', GA_ID, { send_page_view: false })
  const script = document.createElement('script')
  script.id = 'ga4-script'
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
  document.head.appendChild(script)
}
