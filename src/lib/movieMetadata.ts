interface MovieMetaResult {
  posterUrl: string | null
  imdbId: string | null
  year: number | null
  genre: string | null
  director: string
  title: string
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

export async function enrichMovieMetadata(director: string, title: string): Promise<MovieMetaResult | null> {
  const apiKey = process.env.OMDB_API_KEY
  if (!apiKey) {
    return { posterUrl: null, imdbId: null, year: null, genre: null, director, title }
  }

  try {
    const term = encodeURIComponent(title)
    const res = await fetch(`https://www.omdbapi.com/?t=${term}&type=movie&apikey=${apiKey}`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json() as Record<string, string>

    if (data.Response === 'False') {
      // Try search fallback
      const searchRes = await fetch(`https://www.omdbapi.com/?s=${term}&type=movie&apikey=${apiKey}`, {
        signal: AbortSignal.timeout(8000),
      })
      const searchData = await searchRes.json() as { Response: string; Search?: { imdbID: string; Title: string }[] }
      if (searchData.Response === 'False' || !searchData.Search?.length) return null

      // Score by title similarity and take best
      const scored = searchData.Search.map(r => ({
        r,
        score: similarity(title.toLowerCase(), r.Title.toLowerCase()),
      })).sort((a, b) => b.score - a.score)

      if (scored[0].score < 0.5) return null

      // Fetch full details for top result
      const detailRes = await fetch(`https://www.omdbapi.com/?i=${scored[0].r.imdbID}&apikey=${apiKey}`, {
        signal: AbortSignal.timeout(8000),
      })
      const detail = await detailRes.json() as Record<string, string>
      if (detail.Response === 'False') return null

      const dirScore = similarity(director.toLowerCase(), (detail.Director ?? '').toLowerCase())
      if (dirScore < 0.25) return null

      return {
        posterUrl: detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : null,
        imdbId: detail.imdbID ?? null,
        year: detail.Year ? parseInt(detail.Year.slice(0, 4)) : null,
        genre: detail.Genre ? detail.Genre.split(',')[0].trim() : null,
        director: detail.Director ?? director,
        title: detail.Title ?? title,
      }
    }

    const dirScore = similarity(director.toLowerCase(), (data.Director ?? '').toLowerCase())
    if (dirScore < 0.25) return null

    return {
      posterUrl: data.Poster && data.Poster !== 'N/A' ? data.Poster : null,
      imdbId: data.imdbID ?? null,
      year: data.Year ? parseInt(data.Year.slice(0, 4)) : null,
      genre: data.Genre ? data.Genre.split(',')[0].trim() : null,
      director: data.Director ?? director,
      title: data.Title ?? title,
    }
  } catch {
    return null
  }
}
