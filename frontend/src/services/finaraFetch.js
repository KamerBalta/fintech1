function detailMessage(data) {
  const d = data?.detail
  if (typeof d === 'string') return d
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    if (typeof d.message === 'string') return d.message
    if (typeof d.msg === 'string') return d.msg
  }
  if (Array.isArray(d)) return d.map((x) => x.msg || JSON.stringify(x)).join(', ')
  return null
}

/**
 * JSON API istekleri (Bearer otomatik). Obje body JSON.stringify edilir.
 */
export async function fetchJson(url, options = {}) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('finara_token') : null
  const headers = { ...options.headers }
  let body = options.body
  if (body != null && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body)
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { ...options, headers, body })
  if (res.status === 204) return null
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { detail: text || 'Bilinmeyen yanıt' }
  }
  if (!res.ok) {
    throw new Error(detailMessage(data) || res.statusText || 'İstek başarısız')
  }
  return data
}
