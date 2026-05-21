import { PrismaClient } from '../src/generated/prisma/client/index.js'
import { PrismaLibSql } from '@prisma/adapter-libsql'


const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL ?? 'file:prod.db' })
const db = new PrismaClient({ adapter })

const OMDB_API_KEY = process.env.OMDB_API_KEY
if (!OMDB_API_KEY) { console.error('OMDB_API_KEY not set'); process.exit(1) }

function similarity(a, b) {
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

async function enrichMovieMetadata(director, title) {
  try {
    const term = encodeURIComponent(title)
    const res = await fetch(`https://www.omdbapi.com/?t=${term}&type=movie&apikey=${OMDB_API_KEY}`, {
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json()

    if (data.Response === 'False') {
      const searchRes = await fetch(`https://www.omdbapi.com/?s=${term}&type=movie&apikey=${OMDB_API_KEY}`, {
        signal: AbortSignal.timeout(8000),
      })
      const searchData = await searchRes.json()
      if (searchData.Response === 'False' || !searchData.Search?.length) return null

      const scored = searchData.Search.map(r => ({
        r,
        score: similarity(title.toLowerCase(), r.Title.toLowerCase()),
      })).sort((a, b) => b.score - a.score)

      if (scored[0].score < 0.5) return null

      const detailRes = await fetch(`https://www.omdbapi.com/?i=${scored[0].r.imdbID}&apikey=${OMDB_API_KEY}`, {
        signal: AbortSignal.timeout(8000),
      })
      const detail = await detailRes.json()
      if (detail.Response === 'False') return null
      if (similarity(director.toLowerCase(), (detail.Director ?? '').toLowerCase()) < 0.25) return null

      return detail.Poster && detail.Poster !== 'N/A' ? detail.Poster : null
    }

    if (similarity(director.toLowerCase(), (data.Director ?? '').toLowerCase()) < 0.25) return null
    return data.Poster && data.Poster !== 'N/A' ? data.Poster : null
  } catch {
    return null
  }
}

const movies = await db.movie.findMany({
  where: { posterUrl: null },
  select: { id: true, title: true, director: true },
})

console.log(`Found ${movies.length} movies without posters`)

let updated = 0
for (const movie of movies) {
  const posterUrl = await enrichMovieMetadata(movie.director, movie.title)
  if (posterUrl) {
    await db.movie.update({ where: { id: movie.id }, data: { posterUrl } })
    console.log(`  ✓ ${movie.title}`)
    updated++
  } else {
    console.log(`  - ${movie.title} (no match)`)
  }
}

console.log(`\nDone. Updated ${updated} of ${movies.length} movies.`)
await db.$disconnect()
