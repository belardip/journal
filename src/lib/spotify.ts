import { similarity } from '@/lib/metadata'

let cachedToken: { token: string; expiresAt: number } | null = null

async function getSpotifyToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token

  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) return null

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json() as { access_token: string; expires_in: number }
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
    return cachedToken.token
  } catch {
    return null
  }
}

/** Finds the Spotify web player URL for a specific album, or null if no confident match. */
export async function getSpotifyAlbumUrl(artist: string, title: string): Promise<string | null> {
  const token = await getSpotifyToken()
  if (!token) return null

  try {
    const q = encodeURIComponent(`album:${title} artist:${artist}`)
    const res = await fetch(`https://api.spotify.com/v1/search?q=${q}&type=album&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json() as {
      albums?: { items: { name: string; artists: { name: string }[]; external_urls: { spotify: string } }[] }
    }
    const results = data.albums?.items ?? []
    if (!results.length) return null

    const scored = results.map(r => {
      const ts = similarity(title.toLowerCase(), r.name.toLowerCase())
      const as_ = similarity(artist.toLowerCase(), (r.artists[0]?.name ?? '').toLowerCase())
      return { r, score: ts * 0.6 + as_ * 0.4, as_ }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best || best.as_ < 0.3 || best.score < 0.55) return null

    return best.r.external_urls.spotify
  } catch {
    return null
  }
}
