interface MetaResult {
  artworkUrl: string | null
  itunesId: string | null
  year: number | null
  genre: string | null
  artist: string
  title: string
}

async function fromItunes(artist: string, title: string): Promise<MetaResult | null> {
  try {
    const term = encodeURIComponent(`${artist} ${title}`)
    const res = await fetch(`https://itunes.apple.com/search?term=${term}&entity=album&limit=10&country=US`, { signal: AbortSignal.timeout(8000) })
    const results: Record<string, unknown>[] = ((await res.json()) as { results: Record<string, unknown>[] }).results ?? []
    if (!results.length) return null

    const scored = results.map(r => {
      const titleA = String(r.collectionName ?? '').toLowerCase()
      const artistA = String(r.artistName ?? '').toLowerCase()
      const ts = similarity(title.toLowerCase(), titleA)
      const as_ = similarity(artist.toLowerCase(), artistA)
      return { r, score: ts * 0.6 + as_ * 0.4, as_ }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best || best.as_ < 0.3 || best.score < 0.55) return null

    const r = best.r
    let artworkUrl = (r.artworkUrl100 as string | null) ?? null
    if (artworkUrl) artworkUrl = artworkUrl.replace('100x100bb', '600x600bb')

    return {
      artworkUrl,
      itunesId: r.collectionId ? String(r.collectionId) : null,
      year: r.releaseDate ? parseInt(String(r.releaseDate).slice(0, 4)) : null,
      genre: (r.primaryGenreName as string | null) ?? null,
      artist: (r.artistName as string) ?? artist,
      title: (r.collectionName as string) ?? title,
    }
  } catch {
    return null
  }
}

async function artworkFromMusicBrainz(artist: string, title: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`artist:${artist} release:${title}`)
    const res = await fetch(`https://musicbrainz.org/ws/2/release?query=${query}&limit=5&fmt=json`, {
      headers: { 'User-Agent': 'TenderbonesApp/1.0 (belardip@gmail.com)' },
      signal: AbortSignal.timeout(8000),
    })
    const releases: Record<string, unknown>[] = ((await res.json()) as { releases: Record<string, unknown>[] }).releases ?? []
    if (!releases.length) return null

    const scored = releases.map(r => {
      const ts = similarity(title.toLowerCase(), String(r.title ?? '').toLowerCase())
      const credit = ((r['artist-credit'] as { artist: { name: string } }[])?.[0]?.artist?.name) ?? ''
      const as_ = similarity(artist.toLowerCase(), credit.toLowerCase())
      return { r, score: ts * 0.6 + as_ * 0.4, as_ }
    }).sort((a, b) => b.score - a.score)

    const best = scored[0]
    if (!best || best.as_ < 0.3 || best.score < 0.55) return null

    const mbid = best.r.id as string
    const caaRes = await fetch(`https://coverartarchive.org/release/${mbid}`, {
      headers: { 'User-Agent': 'TenderbonesApp/1.0 (belardip@gmail.com)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!caaRes.ok) return null

    const images: { front?: boolean; thumbnails?: { 500?: string }; image?: string }[] =
      ((await caaRes.json()) as { images: typeof images }).images ?? []
    const front = images.find(i => i.front) ?? images[0]
    return front?.thumbnails?.[500] ?? front?.image ?? null
  } catch {
    return null
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  if (!longer.length) return 1
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }
  return matches / longer.length
}

export async function enrichAlbumMetadata(artist: string, title: string): Promise<MetaResult | null> {
  const itunes = await fromItunes(artist, title)
  if (itunes?.artworkUrl) return itunes

  const mbArtwork = await artworkFromMusicBrainz(artist, title)
  if (mbArtwork) {
    return {
      ...(itunes ?? { artist, title, year: null, genre: null, itunesId: null }),
      artworkUrl: mbArtwork,
    }
  }

  return itunes
}
