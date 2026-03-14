export function getViewerIdFromCookie(cookieHeader: string | null | undefined) {
  const cookie = cookieHeader || ''
  const match = cookie.match(/(?:^|;\s*)viewer_id=([^;]+)/)
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export function ensureCbVid() {
  try {
    let value = window.localStorage.getItem('cb_vid') || ''
    if (!value) {
      value = crypto.randomUUID()
      window.localStorage.setItem('cb_vid', value)
    }
    return value
  } catch {
    return ''
  }
}
