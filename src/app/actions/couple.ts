'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { callClaudeJson } from '@/lib/ai'
import { enrichMovieMetadata } from '@/lib/movieMetadata'
import { parseJson } from '@/lib/albums'

const OPUS = 'claude-opus-4-7'

function coupleProfileSection(profile: {
  paulSummary?: string | null
  rebeccaSummary?: string | null
  coupleSummary?: string | null
  sharedGenres: string
  sharedDirectors: string
  sharedDecades: string
  moodPreferences: string
  paulSpecific: string
  rebeccaSpecific: string
  dislikedPatterns: string
} | null) {
  if (!profile?.coupleSummary) return 'No watch history yet.'
  const sg = parseJson<string[]>(profile.sharedGenres, [])
  const sd = parseJson<string[]>(profile.sharedDirectors, [])
  const dec = parseJson<string[]>(profile.sharedDecades, [])
  const m = parseJson<string[]>(profile.moodPreferences, [])
  const ps = parseJson<string[]>(profile.paulSpecific, [])
  const rs = parseJson<string[]>(profile.rebeccaSpecific, [])
  const x = parseJson<string[]>(profile.dislikedPatterns, [])
  return [
    `Couple summary: ${profile.coupleSummary}`,
    profile.paulSummary ? `Paul's taste: ${profile.paulSummary}` : '',
    profile.rebeccaSummary ? `Rebecca's taste: ${profile.rebeccaSummary}` : '',
    sg.length ? `Both enjoy: ${sg.join(', ')}` : '',
    sd.length ? `Shared favourite directors: ${sd.join(', ')}` : '',
    dec.length ? `Preferred decades: ${dec.join(', ')}` : '',
    m.length ? `Mood preferences: ${m.join(', ')}` : '',
    ps.length ? `Paul specifically likes: ${ps.join(', ')}` : '',
    rs.length ? `Rebecca specifically likes: ${rs.join(', ')}` : '',
    x.length ? `Both dislike: ${x.join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

export async function rateCoupleMovieAction(
  id: number, person: 'paul' | 'rebecca', rating: number, notes: string
) {
  const movie = await db.coupleMovie.findUnique({ where: { id } })
  if (!movie) return

  const data: Record<string, unknown> = person === 'paul'
    ? { paulRating: rating, paulNotes: notes || null }
    : { rebeccaRating: rating, rebeccaNotes: notes || null }

  const newPaul = person === 'paul' ? rating : movie.paulRating
  const newRebecca = person === 'rebecca' ? rating : movie.rebeccaRating
  if (newPaul && newRebecca) {
    data.status = 'watched'
    data.watchedAt = new Date()
  }

  await db.coupleMovie.update({ where: { id }, data })
  revalidatePath('/couple')
  updateCoupleTasteProfileAction().catch(console.error)
}

export async function skipCoupleMovieAction(id: number) {
  await db.coupleMovie.update({ where: { id }, data: { status: 'skipped' } })
  revalidatePath('/couple')
}

export async function updateCoupleTasteProfileAction() {
  const watched = await db.coupleMovie.findMany({
    where: { OR: [{ paulRating: { not: null } }, { rebeccaRating: { not: null } }] },
    orderBy: { watchedAt: 'desc' },
  })
  if (!watched.length) return

  await db.coupleTasteProfile.upsert({ where: { id: 1 }, create: { isUpdating: true }, update: { isUpdating: true } })

  const lines = watched.map(m => {
    const parts = [`${m.director} — ${m.title}`]
    if (m.year) parts.push(`(${m.year})`)
    if (m.paulRating) parts.push(`Paul: ${m.paulRating}/10`)
    if (m.rebeccaRating) parts.push(`Rebecca: ${m.rebeccaRating}/10`)
    if (m.paulNotes) parts.push(`Paul's notes: ${m.paulNotes}`)
    if (m.rebeccaNotes) parts.push(`Rebecca's notes: ${m.rebeccaNotes}`)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `Analyse this couple's movie ratings and build a joint film taste profile for their AI curator. The couple is Paul and Rebecca.

Watch history (most recent first):
${lines}

Return ONLY this JSON, no markdown:
{
  "paul_summary": "1-2 sentences on Paul's individual taste",
  "rebecca_summary": "1-2 sentences on Rebecca's individual taste",
  "couple_summary": "2-3 sentence prose on what they enjoy together as a couple",
  "shared_genres": ["genres both tend to rate highly"],
  "shared_directors": ["directors both appreciate"],
  "shared_decades": ["eras both enjoy"],
  "mood_preferences": ["moods or vibes both gravitate toward"],
  "paul_specific": ["things Paul likes that Rebecca rates lower or hasn't rated"],
  "rebecca_specific": ["things Rebecca likes that Paul rates lower or hasn't rated"],
  "disliked_patterns": ["things either person consistently rates low"]
}`

  const data = await callClaudeJson<Record<string, unknown>>(prompt, { model: OPUS, maxTokens: 2048 })

  await db.coupleTasteProfile.upsert({
    where: { id: 1 },
    create: {
      paulSummary: data.paul_summary as string ?? '',
      rebeccaSummary: data.rebecca_summary as string ?? '',
      coupleSummary: data.couple_summary as string ?? '',
      sharedGenres: JSON.stringify(data.shared_genres ?? []),
      sharedDirectors: JSON.stringify(data.shared_directors ?? []),
      sharedDecades: JSON.stringify(data.shared_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      paulSpecific: JSON.stringify(data.paul_specific ?? []),
      rebeccaSpecific: JSON.stringify(data.rebecca_specific ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      moviesAnalyzed: watched.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
    update: {
      paulSummary: data.paul_summary as string ?? '',
      rebeccaSummary: data.rebecca_summary as string ?? '',
      coupleSummary: data.couple_summary as string ?? '',
      sharedGenres: JSON.stringify(data.shared_genres ?? []),
      sharedDirectors: JSON.stringify(data.shared_directors ?? []),
      sharedDecades: JSON.stringify(data.shared_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      paulSpecific: JSON.stringify(data.paul_specific ?? []),
      rebeccaSpecific: JSON.stringify(data.rebecca_specific ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      moviesAnalyzed: watched.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
  })

  revalidatePath('/couple')
}

export async function generateCoupleOnboardingMoviesAction(
  paulFavorites: string[], rebeccaFavorites: string[]
): Promise<{ title: string; director: string; year: number | null; genre: string | null; posterUrl: string | null }[]> {
  const paulList = paulFavorites.filter(Boolean).join(', ')
  const rebeccaList = rebeccaFavorites.filter(Boolean).join(', ')

  const prompt = `You are a film curator setting up a profile for a couple. Generate exactly 25 well-known films for a joint onboarding quiz.

Paul's favourite films: ${paulList}
Rebecca's favourite films: ${rebeccaList}

Rules:
- Include films similar to both people's tastes
- Span multiple decades (1960s through 2020s)
- Include at least 3 foreign-language films
- Cover a range of genres: drama, thriller, comedy, sci-fi, action, horror, animation, documentary
- Choose films acclaimed enough that most moviegoers have seen or at least heard of them
- Do NOT include either person's stated favourites

Return ONLY a JSON array of exactly 25 objects, no markdown:
[{"title": "...", "director": "...", "year": 1994, "genre": "..."}]`

  const movies = await callClaudeJson<{ title: string; director: string; year: number | null; genre: string | null }[]>(
    prompt, { model: OPUS, maxTokens: 2048 }
  )

  const enriched = await Promise.allSettled(movies.map(m => enrichMovieMetadata(m.director, m.title)))

  return movies.map((m, i) => {
    const result = enriched[i]
    const meta = result.status === 'fulfilled' ? result.value : null
    return {
      title: meta?.title ?? m.title,
      director: meta?.director ?? m.director,
      year: meta?.year ?? m.year,
      genre: meta?.genre ?? m.genre,
      posterUrl: meta?.posterUrl ?? null,
    }
  })
}

export async function completeCoupleOnboardingAction(
  ratings: {
    title: string; director: string; year: number | null; genre: string | null
    posterUrl: string | null; paulRating: number | null; rebeccaRating: number | null
  }[]
) {
  const toSave = ratings.filter(r => r.paulRating !== null || r.rebeccaRating !== null)
  await db.coupleMovie.createMany({
    data: toSave.map(r => ({
      title: r.title, director: r.director, year: r.year, genre: r.genre,
      posterUrl: r.posterUrl,
      paulRating: r.paulRating,
      rebeccaRating: r.rebeccaRating,
      status: r.paulRating && r.rebeccaRating ? 'watched' : 'recommended',
      watchedAt: r.paulRating && r.rebeccaRating ? new Date() : null,
    })),
  })
  revalidatePath('/couple')
  updateCoupleTasteProfileAction().catch(console.error)
}

export async function generateCoupleRecommendationsAction(prompt: string) {
  const profile = await db.coupleTasteProfile.findFirst()

  const historyDirectors = (await db.coupleMovie.findMany({
    where: { OR: [{ paulRating: { not: null } }, { rebeccaRating: { not: null } }] },
    orderBy: { createdAt: 'desc' }, take: 20, select: { director: true },
  })).map(m => m.director).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')

  const recentDirectors = (await db.coupleMovie.findMany({
    where: { batchId: { not: null } },
    orderBy: { createdAt: 'desc' }, take: 15, select: { director: true },
  })).map(m => m.director).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')

  const request = prompt.trim() || "Surprise us — pick whatever you think we'd both love most right now."
  const pSection = coupleProfileSection(profile)

  const p1 = `You are an expert film curator recommending movies for a couple — Paul and Rebecca. Based on their joint taste profile and current request, choose 5 directors whose work they would both enjoy.

## Couple's Taste Profile
${pSection}

${historyDirectors ? `## Already watched films by these directors (do not suggest again)\n${historyDirectors}\n\n` : ''}${recentDirectors ? `## Recently recommended directors (avoid repeating)\n${recentDirectors}\n\n` : ''}## Their Request
"${request}"

Rules:
- 5 different directors, no duplicates
- Pick directors whose work suits BOTH people, not just one
- The reason should explain why both Paul and Rebecca would enjoy it

Return ONLY a JSON array of 5 objects, no markdown:
[{"director": "Director Name", "reason": "Why this suits both of them..."}]`

  const directorPicks = await callClaudeJson<{ director: string; reason: string }[]>(p1, { model: OPUS })

  const batch = await db.coupleMovieRecommendationBatch.create({ data: { prompt: prompt || null } })

  if (!directorPicks.length) return batch.id

  const directorList = directorPicks.map(d => `- ${d.director}`).join('\n')
  const tasteSummary = profile?.coupleSummary ? `\n\nCouple taste summary: ${profile.coupleSummary.slice(0, 300)}` : ''

  const p2 = `For each director below, name the single film that would best suit this couple to watch together.

Their request: "${request}"${tasteSummary}

Directors:
${directorList}

CRITICAL: Use the exact film title as it appears in databases. Only name films you are certain exist and were directed by that director.

Return ONLY a JSON array (one object per director), no markdown:
[{"director": "Director Name", "title": "Exact Film Title", "year": 2017, "genre": "Genre"}]`

  const suggestions = await callClaudeJson<{ director: string; title: string; year?: number; genre?: string }[]>(p2, { model: OPUS })
  const reasonMap = new Map(directorPicks.map(d => [d.director.toLowerCase(), d.reason]))

  let saved = 0
  for (const s of suggestions) {
    if (saved >= 3) break
    const meta = await enrichMovieMetadata(s.director, s.title)
    if (!meta) continue
    await db.coupleMovie.create({
      data: {
        batchId: batch.id,
        title: meta.title, director: meta.director,
        year: meta.year ?? s.year ?? null,
        genre: meta.genre ?? s.genre ?? null,
        posterUrl: meta.posterUrl, imdbId: meta.imdbId,
        recommendedReason: reasonMap.get(s.director.toLowerCase()) ?? null,
        status: 'recommended',
      },
    })
    saved++
  }

  revalidatePath('/couple')
  return batch.id
}
