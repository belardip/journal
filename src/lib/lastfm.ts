const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/'

async function lastfmGet(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const key = process.env.LASTFM_API_KEY
  if (!key) return null
  const qs = new URLSearchParams({ ...params, api_key: key, format: 'json' })
  try {
    const res = await fetch(`${LASTFM_BASE}?${qs}`, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    if (data?.error) return null
    return data
  } catch {
    return null
  }
}

/** Real "fans of X also like" data — used to ground artist suggestions instead of relying purely on an LLM's memory. */
export async function getSimilarArtists(artist: string, limit = 10): Promise<string[]> {
  const data = await lastfmGet({ method: 'artist.getSimilar', artist, limit: String(limit), autocorrect: '1' })
  const list = (data?.similarartists as { artist?: { name?: string }[] } | undefined)?.artist
  if (!Array.isArray(list)) return []
  return list.map(a => a.name).filter((n): n is string => Boolean(n))
}

/** An artist's real discography (by popularity) — used so the album-picking pass can only choose a title that actually exists. */
export async function getTopAlbums(artist: string, limit = 15): Promise<string[]> {
  const data = await lastfmGet({ method: 'artist.gettopalbums', artist, limit: String(limit), autocorrect: '1' })
  const list = (data?.topalbums as { album?: { name?: string }[] } | undefined)?.album
  if (!Array.isArray(list)) return []
  return list.map(a => a.name).filter((n): n is string => Boolean(n))
}
