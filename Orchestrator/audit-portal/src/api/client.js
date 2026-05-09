const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function requestJson(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = payload?.detail || payload?.message || `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return response.json()
}

export function getRecentRequests(limit = 50) {
  return requestJson(`/audit/recent?limit=${encodeURIComponent(limit)}`)
}

export function getRequestDetail(requestId) {
  return requestJson(`/status/${encodeURIComponent(requestId)}`)
}

export function getStats() {
  return requestJson('/audit/stats')
}

export { BASE_URL }
