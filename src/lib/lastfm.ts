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

async function getAlbumYear(artist: string, album: string): Promise<number | null> {
  const data = await lastfmGet({ method: 'album.getInfo', artist, album, autocorrect: '1' })
  const info = data?.album as { tags?: { tag?: { name?: string }[] }; wiki?: { summary?: string } } | undefined
  if (!info) return null
  const tags = (info.tags?.tag ?? []).map(t => t.name).filter((n): n is string => Boolean(n))
  return extractYear(tags, info.wiki?.summary)
}

/** An artist's real discography with verified release years, so the album-picking pass can
 *  check a decade/year request against real data instead of guessing from memory. Filters
 *  out compilations/greatest-hits (they span eras and have no single meaningful year). */
export async function getTopAlbumsWithYears(artist: string, limit = 10): Promise<{ title: string; year: number | null }[]> {
  const names = (await getTopAlbums(artist, limit)).filter(n => !COMPILATION_RE.test(n))
  const years = await Promise.all(names.map(n => getAlbumYear(artist, n)))
  return names.map((title, i) => ({ title, year: years[i] }))
}
