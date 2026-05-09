export function parseJson<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T } catch { return fallback }
}

export function formatAlbumMeta(album: { artist: string; title: string; year?: number | null; genre?: string | null }) {
  const parts = [album.artist, album.title]
  if (album.year) parts.push(String(album.year))
  if (album.genre) parts.push(album.genre)
  return parts
}

export function ratingColor(rating: number) {
  if (rating >= 8) return 'text-green-600'
  if (rating >= 6) return 'text-amber-500'
  return 'text-muted-foreground'
}
