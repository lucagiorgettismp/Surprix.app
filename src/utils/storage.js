export const onImgError = (e) => {
  e.currentTarget.src = '/img-placeholder.svg'
  e.currentTarget.onerror = null
}

export const gsToHttps = (gsUrl) => {
  if (!gsUrl) return null
  if (!gsUrl.startsWith('gs://')) return gsUrl

  const withoutProtocol = gsUrl.slice(5)
  const slashIndex = withoutProtocol.indexOf('/')
  const bucket = withoutProtocol.slice(0, slashIndex)
  const path = withoutProtocol.slice(slashIndex + 1)

  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`
}
