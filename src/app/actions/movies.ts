'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { callClaudeJson } from '@/lib/ai'
import { enrichMovieMetadata } from '@/lib/movieMetadata'
import { parseJson } from '@/lib/albums'

const OPUS = 'claude-opus-4-7'

function profileSection(profile: {
  summary?: string | null
  favoriteGenres: string
  favoriteDirectors: string
  preferredDecades: string
  moodPreferences: string
  dislikedPatterns: string
} | null) {
  if (!profile?.summary) return 'No watch history yet.'
  const g = parseJson<string[]>(profile.favoriteGenres, [])
  const d = parseJson<string[]>(profile.favoriteDirectors, [])
  const dec = parseJson<string[]>(profile.preferredDecades, [])
  const m = parseJson<string[]>(profile.moodPreferences, [])
  const x = parseJson<string[]>(profile.dislikedPatterns, [])
  return [
    profile.summary,
    g.length ? `Favorite genres: ${g.join(', ')}` : '',
    d.length ? `Favorite directors: ${d.join(', ')}` : '',
    dec.length ? `Preferred decades: ${dec.join(', ')}` : '',
    m.length ? `Mood preferences: ${m.join(', ')}` : '',
    x.length ? `Disliked patterns: ${x.join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

export async function rateMovieAction(id: number, rating: number, notes: string) {
  await db.movie.update({
    where: { id },
    data: { status: 'watched', rating, notes: notes || null, watchedAt: new Date() },
  })
  revalidatePath('/movies')
  updateMovieTasteProfileAction().catch(console.error)
}

export async function skipMovieAction(id: number) {
  await db.movie.update({ where: { id }, data: { status: 'skipped' } })
  revalidatePath('/movies')
}

export async function updateMovieTasteProfileAction() {
  const watched = await db.movie.findMany({
    where: { status: 'watched' },
    orderBy: { watchedAt: 'desc' },
  })
  if (!watched.length) return

  await db.movieTasteProfile.upsert({ where: { id: 1 }, create: { isUpdating: true }, update: { isUpdating: true } })

  const lines = watched.map(m => {
    const parts = [`${m.director} — ${m.title}`]
    if (m.year) parts.push(`(${m.year})`)
    if (m.rating) parts.push(`Rating: ${m.rating}/10`)
    if (m.notes) parts.push(`Notes: ${m.notes}`)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `Analyse this viewer's movie ratings and generate an updated film taste profile for their AI curator.\n\nWatch history (most recent first):\n${lines}\n\nReturn ONLY this JSON object, no markdown:\n{\n  "summary": "2-3 paragraph prose in second person describing their taste",\n  "favorite_genres": ["..."],\n  "favorite_directors": ["..."],\n  "preferred_decades": ["..."],\n  "mood_preferences": ["..."],\n  "disliked_patterns": ["..."]\n}`

  const data = await callClaudeJson<Record<string, unknown>>(prompt, { model: OPUS })

  await db.movieTasteProfile.upsert({
    where: { id: 1 },
    create: {
      summary: data.summary as string ?? '',
      favoriteGenres: JSON.stringify(data.favorite_genres ?? []),
      favoriteDirectors: JSON.stringify(data.favorite_directors ?? []),
      preferredDecades: JSON.stringify(data.preferred_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      moviesAnalyzed: watched.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
    update: {
      summary: data.summary as string ?? '',
      favoriteGenres: JSON.stringify(data.favorite_genres ?? []),
      favoriteDirectors: JSON.stringify(data.favorite_directors ?? []),
      preferredDecades: JSON.stringify(data.preferred_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      moviesAnalyzed: watched.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
  })

  revalidatePath('/movies/profile')
}

export async function addMovieProfileContextAction(context: string) {
  const profile = await db.movieTasteProfile.findFirst()
  if (!profile) return

  const g = parseJson<string[]>(profile.favoriteGenres, [])
  const d = parseJson<string[]>(profile.favoriteDirectors, [])
  const dec = parseJson<string[]>(profile.preferredDecades, [])
  const m = parseJson<string[]>(profile.moodPreferences, [])
  const x = parseJson<string[]>(profile.dislikedPatterns, [])

  const prompt = `You are updating a film taste profile for an AI curator.\n\nCurrent profile:\nSummary: ${profile.summary}\nGenres: ${g.join(', ') || 'none'}\nDirectors: ${d.join(', ') || 'none'}\nEras: ${dec.join(', ') || 'none'}\nMoods: ${m.join(', ') || 'none'}\nDislikes: ${x.join(', ') || 'none'}\n\nThe viewer has added:\n"${context}"\n\nUpdate the full profile incorporating the new information.\n\nReturn ONLY this JSON (no markdown):\n{\n  "summary": "updated 2-3 paragraph prose in second person",\n  "favorite_genres": ["updated list"],\n  "favorite_directors": ["updated list"],\n  "preferred_decades": ["updated list"],\n  "mood_preferences": ["updated list"],\n  "disliked_patterns": ["updated list"]\n}`

  const data = await callClaudeJson<Record<string, unknown>>(prompt, { model: OPUS })

  await db.movieTasteProfile.update({
    where: { id: profile.id },
    data: {
      summary: data.summary as string ?? profile.summary,
      favoriteGenres: JSON.stringify(data.favorite_genres ?? g),
      favoriteDirectors: JSON.stringify(data.favorite_directors ?? d),
      preferredDecades: JSON.stringify(data.preferred_decades ?? dec),
      moodPreferences: JSON.stringify(data.mood_preferences ?? m),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? x),
      lastUpdatedAt: new Date(),
    },
  })

  revalidatePath('/movies/profile')
}

export async function generateOnboardingMoviesAction(favorites: string[]): Promise<{ title: string; director: string; year: number | null; genre: string | null; posterUrl: string | null; rtScore: string | null; actors: string | null }[]> {
  const favList = favorites.filter(Boolean).join(', ')
  const prompt = `You are a film curator. A viewer's favorite movies are: ${favList}

Generate a list of exactly 25 well-known films for an onboarding quiz. Rules:
- Include some films similar in style or theme to their favorites
- Span multiple decades (1960s through 2020s)
- Include at least 3 foreign-language films
- Cover a range of genres: drama, thriller, comedy, sci-fi, action, horror, animation, documentary
- Choose films acclaimed enough that most moviegoers have seen or at least heard of them
- Do NOT include the viewer's stated favorites in the list

Return ONLY a JSON array of exactly 25 objects, no markdown:
[{"title": "...", "director": "...", "year": 1994, "genre": "..."}]`

  const movies = await callClaudeJson<{ title: string; director: string; year: number | null; genre: string | null }[]>(prompt, { model: OPUS, maxTokens: 2048 })

  const enriched = await Promise.allSettled(
    movies.map(m => enrichMovieMetadata(m.director, m.title))
  )

  return movies.map((m, i) => {
    const result = enriched[i]
    const meta = result.status === 'fulfilled' ? result.value : null
    return {
      title: meta?.title ?? m.title,
      director: meta?.director ?? m.director,
      year: meta?.year ?? m.year,
      genre: meta?.genre ?? m.genre,
      posterUrl: meta?.posterUrl ?? null,
      rtScore: meta?.rtScore ?? null,
      actors: meta?.actors ?? null,
    }
  })
}

export async function completeMovieOnboardingAction(
  ratings: { title: string; director: string; year: number | null; genre: string | null; posterUrl: string | null; rtScore: string | null; actors: string | null; rating: number }[]
) {
  await db.movie.createMany({
    data: ratings.map(r => ({
      title: r.title,
      director: r.director,
      year: r.year,
      genre: r.genre,
      posterUrl: r.posterUrl,
      rtScore: r.rtScore,
      actors: r.actors,
      status: 'watched',
      rating: r.rating,
      watchedAt: new Date(),
    })),
  })
  revalidatePath('/movies')
  updateMovieTasteProfileAction().catch(console.error)
}

export async function generateMovieRecommendationsAction(prompt: string) {
  const profile = await db.movieTasteProfile.findFirst()

  const historyDirectors = (await db.movie.findMany({
    where: { status: 'watched' },
    orderBy: { watchedAt: 'desc' },
    take: 20,
    select: { director: true },
  })).map(m => m.director).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')

  const recentDirectors = (await db.movie.findMany({
    where: { batchId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { director: true },
  })).map(m => m.director).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')

  const existingTitles = (await db.movie.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
    select: { title: true },
  })).map(m => m.title).join(', ')

  const request = prompt.trim() || "Surprise me — pick whatever you think I'd love most right now."
  const pSection = profileSection(profile)

  // Pass 1: pick directors
  const p1 = `You are an expert film curator. The viewer has made a specific request — treat it as the primary directive. Then use their taste profile to refine which directors within that space they'd most connect with.\n\n## Their Request\n"${request}"\n\n## Viewer's Taste Profile (use to refine, not override the request)\n${pSection}\n\n${historyDirectors ? `## Already watched films by these directors (do not suggest them again)\n${historyDirectors}\n\n` : ''}${recentDirectors ? `## Recently recommended directors (avoid repeating)\n${recentDirectors}\n\n` : ''}Rules:\n- Choose 5 directors whose work directly matches the request first, then fits their taste\n- If the request names a specific film or director, find directors in that same space\n- 5 different directors, no duplicates\n- The reason should explain how this director fits both the request and their taste\n\nReturn ONLY a JSON array of 5 objects, no markdown:\n[{"director": "Director Name", "reason": "Why this fits..."}]`

  const directorPicks = await callClaudeJson<{ director: string; reason: string }[]>(p1, { model: OPUS })

  const batch = await db.movieRecommendationBatch.create({ data: { prompt: prompt || null } })

  await db.movieRecommendationLog.create({
    data: {
      batchId: batch.id,
      level: 'info',
      event: 'pass1_directors',
      detail: JSON.stringify({ prompt: prompt || '(none)', count: directorPicks.length, directors: directorPicks }),
    },
  })

  if (!directorPicks.length) {
    await db.movieRecommendationLog.create({
      data: { batchId: batch.id, level: 'error', event: 'batch_complete', detail: JSON.stringify({ saved: 0, error: 'Pass 1 returned no directors' }) },
    })
    return batch.id
  }

  // Pass 2: pick films
  const directorList = directorPicks.map(d => `- ${d.director}`).join('\n')
  const tasteSummary = profile?.summary ? `\n\nViewer taste summary: ${profile.summary.slice(0, 300)}` : ''
  const p2 = `For each director below, name the single film that would best suit this viewer.\n\nTheir request: "${request}"${tasteSummary}\n\nDirectors:\n${directorList}\n\n${existingTitles ? `Do NOT suggest any of these films — they are already in the viewer's library:\n${existingTitles}\n\n` : ''}CRITICAL: Use the exact film title as it appears in databases. Only name films you are certain exist and were directed by that director.\n\nReturn ONLY a JSON array (one object per director), no markdown:\n[{"director": "Director Name", "title": "Exact Film Title", "year": 2017, "genre": "Genre"}]`

  const suggestions = await callClaudeJson<{ director: string; title: string; year?: number; genre?: string }[]>(p2, { model: OPUS })

  await db.movieRecommendationLog.create({
    data: { batchId: batch.id, level: 'info', event: 'pass2_films', detail: JSON.stringify({ count: suggestions.length, suggestions }) },
  })

  let saved = 0
  for (let i = 0; i < suggestions.length; i++) {
    if (saved >= 3) break
    const s = suggestions[i]
    // Match reason by index — same order as directorPicks — not by name (avoids mismatch when Claude hallucinates wrong director)
    const reason = directorPicks[i]?.reason ?? null
    const meta = await enrichMovieMetadata(s.director, s.title)
    const noMatch = !meta

    await db.movieRecommendationLog.create({
      data: {
        batchId: batch.id,
        level: noMatch ? 'warn' : 'info',
        event: noMatch ? 'movie_skipped' : 'movie_saved',
        detail: JSON.stringify({ claude_director: s.director, claude_title: s.title, matched: !noMatch }),
      },
    })

    if (noMatch) continue

    await db.movie.create({
      data: {
        batchId: batch.id,
        title: meta.title,
        director: meta.director,
        year: meta.year ?? s.year ?? null,
        genre: meta.genre ?? s.genre ?? null,
        posterUrl: meta.posterUrl,
        imdbId: meta.imdbId,
        rtScore: meta.rtScore,
        actors: meta.actors,
        recommendedReason: reason,
        status: 'recommended',
      },
    })
    saved++
  }

  await db.movieRecommendationLog.create({
    data: {
      batchId: batch.id,
      level: saved < 3 ? 'warn' : 'info',
      event: 'batch_complete',
      detail: JSON.stringify({ saved, of_candidates: suggestions.length }),
    },
  })

  revalidatePath('/movies')
  return batch.id
}
