const TTL = 30000 // 30 seconds

export function getCached<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`cache:${key}`)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > TTL) { sessionStorage.removeItem(`cache:${key}`); return null }
    return data as T
  } catch { return null }
}

export function setCache(key: string, data: unknown): void {
  try { sessionStorage.setItem(`cache:${key}`, JSON.stringify({ data, ts: Date.now() })) } catch { /* quota exceeded */ }
}

export function clearCache(): void {
  try {
    Object.keys(sessionStorage).filter(k => k.startsWith('cache:')).forEach(k => sessionStorage.removeItem(k))
  } catch { /* ignore */ }
}
