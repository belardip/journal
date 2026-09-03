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

/** Real "fans of X also like" data, with Last.fm's match score, so multiple seed
 *  artists can be blended by score/overlap instead of naively concatenated. */
export async function getSimilarArtistsScored(artist: string, limit = 10): Promise<{ name: string; match: number }[]> {
  const data = await lastfmGet({ method: 'artist.getSimilar', artist, limit: String(limit), autocorrect: '1' })
  const list = (data?.similarartists as { artist?: { name?: string; match?: string }[] } | undefined)?.artist
  if (!Array.isArray(list)) return []
  return list
    .filter((a): a is { name: string; match?: string } => Boolean(a.name))
    .map(a => ({ name: a.name, match: parseFloat(a.match ?? '0') || 0 }))
}

/** Real "fans of X also like Y" data — used to ground artist suggestions instead of relying purely on an LLM's memory. */
export async function getSimilarArtists(artist: string, limit = 10): Promise<string[]> {
  return (await getSimilarArtistsScored(artist, limit)).map(a => a.name)
}

/** Blends similar-artist results from multiple seed artists: artists that show up as
 *  similar to MULTIPLE seeds (a genuine "fans of both" match) are ranked above ones
 *  that only score well against a single seed. With one seed this is equivalent to a
 *  plain score sort, so it's a superset of the single-artist case. */
export async function getBlendedSimilarArtists(seedArtists: string[], excluding: string[] = [], limit = 15): Promise<string[]> {
  const lists = await Promise.all(seedArtists.map(a => getSimilarArtistsScored(a, 20)))
  const excludeSet = new Set(excluding.map(a => a.toLowerCase()))
  const seedSet = new Set(seedArtists.map(a => a.toLowerCase()))

  const combined = new Map<string, { name: string; score: number; seenIn: number }>()
  for (const list of lists) {
    for (const { name, match } of list) {
      const key = name.toLowerCase()
      if (excludeSet.has(key) || seedSet.has(key)) continue
      const existing = combined.get(key)
      if (existing) {
        existing.score += match
        existing.seenIn += 1
      } else {
        combined.set(key, { name, score: match, seenIn: 1 })
      }
    }
  }

  return [...combined.values()]
    .sort((a, b) => (b.seenIn !== a.seenIn ? b.seenIn - a.seenIn : b.score - a.score))
    .slice(0, limit)
    .map(a => a.name)
}

/** An artist's real discography (by popularity) — used so the album-picking pass can only choose a title that actually exists. */
export async function getTopAlbums(artist: string, limit = 15): Promise<string[]> {
  const data = await lastfmGet({ method: 'artist.gettopalbums', artist, limit: String(limit), autocorrect: '1' })
  const list = (data?.topalbums as { album?: { name?: string }[] } | undefined)?.album
  if (!Array.isArray(list)) return []
  return list.map(a => a.name).filter((n): n is string => Boolean(n))
}

// Compilations/reissues span multiple eras and pollute year-constrained picks — drop them
// before spending API calls resolving their (meaningless) release year.
const COMPILATION_RE = /(greatest hits|best of|definitive collection|anthology|essential|live at|the collection|number 1|singles)/i

const YEAR_TAG_RE = /^(19|20)\d{2}$/
const DECADE_TAG_RE = /^((?:19|20)\d)0s$/

/** Pulls a release year out of Last.fm's community tags (e.g. "1971", "70s"), falling
 *  back to the wiki summary prose ("...released on December 17, 1971...") when untagged. */
function extractYear(tags: string[], wikiSummary?: string): number | null {
  const yearTag = tags.find(t => YEAR_TAG_RE.test(t))
  if (yearTag) return parseInt(yearTag, 10)

  const decadeTag = tags.find(t => DECADE_TAG_RE.test(t))
  if (decadeTag) return parseInt(decadeTag.slice(0, -1) + '0', 10)

  if (wikiSummary) {
    const m = wikiSummary.match(/released[^.]{0,40}?((?:19|20)\d{2})/i)
    if (m) return parseInt(m[1], 10)
  }

  return null
}

async function fetchAlbumInfo(artist: string, album: string): Promise<{ tags: string[]; wikiSummary?: string } | null> {
  const data = await lastfmGet({ method: 'album.getInfo', artist, album, autocorrect: '1' })
  const info = data?.album as { tags?: { tag?: { name?: string }[] | { name?: string } }; wiki?: { summary?: string } } | undefined
  if (!info) return null
  // Last.fm's JSON serialises a single-item list as a bare object instead of a 1-element array.
  const rawTags = info.tags?.tag
  const tagList = Array.isArray(rawTags) ? rawTags : rawTags ? [rawTags] : []
  const tags = tagList.map(t => t.name).filter((n): n is string => Boolean(n))
  return { tags, wikiSummary: info.wiki?.summary }
}

async function getAlbumYear(artist: string, album: string): Promise<number | null> {
  const info = await fetchAlbumInfo(artist, album)
  if (!info) return null
  return extractYear(info.tags, info.wikiSummary)
}

/** An album's Last.fm community tags (genre, mood, era, etc.) — the same folksonomy data
 *  used for release years, reused here to check a rated album against mood/energy keywords. */
export async function getAlbumTags(artist: string, album: string): Promise<string[]> {
  const info = await fetchAlbumInfo(artist, album)
  return info?.tags ?? []
}

/** An artist's real discography with verified release years, so the album-picking pass can
 *  check a decade/year request against real data instead of guessing from memory. Filters
 *  out compilations/greatest-hits (they span eras and have no single meaningful year). */
export async function getTopAlbumsWithYears(artist: string, limit = 10): Promise<{ title: string; year: number | null }[]> {
  const names = (await getTopAlbums(artist, limit)).filter(n => !COMPILATION_RE.test(n))
  const years = await Promise.all(names.map(n => getAlbumYear(artist, n)))
  return names.map((title, i) => ({ title, year: years[i] }))
}
