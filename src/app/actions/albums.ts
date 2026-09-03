'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { callClaudeJson } from '@/lib/ai'
import { enrichAlbumMetadata } from '@/lib/metadata'
import { getSpotifyAlbumMatch } from '@/lib/spotify'
import { getSimilarArtists, getTopAlbumsWithYears } from '@/lib/lastfm'
import { parseJson } from '@/lib/albums'

const OPUS = 'claude-opus-4-7'
const HAIKU = 'claude-haiku-4-5-20251001'

// ── helpers ──────────────────────────────────────────────────────────────────

function profileSection(profile: {
  summary?: string | null
  favoriteGenres: string
  favoriteArtists: string
  preferredDecades: string
  moodPreferences: string
  dislikedPatterns: string
} | null) {
  if (!profile?.summary) return 'No listening history yet.'
  const g = parseJson<string[]>(profile.favoriteGenres, [])
  const a = parseJson<string[]>(profile.favoriteArtists, [])
  const d = parseJson<string[]>(profile.preferredDecades, [])
  const m = parseJson<string[]>(profile.moodPreferences, [])
  const x = parseJson<string[]>(profile.dislikedPatterns, [])
  return [
    profile.summary,
    g.length ? `Favorite genres: ${g.join(', ')}` : '',
    a.length ? `Favorite artists: ${a.join(', ')}` : '',
    d.length ? `Preferred decades: ${d.join(', ')}` : '',
    m.length ? `Mood preferences: ${m.join(', ')}` : '',
    x.length ? `Disliked patterns: ${x.join(', ')}` : '',
  ].filter(Boolean).join('\n')
}

// ── rate album ────────────────────────────────────────────────────────────────

export async function rateAlbumAction(id: number, rating: number, notes: string) {
  await db.album.update({
    where: { id },
    data: { status: 'listened', rating, notes: notes || null, listenedAt: new Date() },
  })
  revalidatePath('/albums')
  updateTasteProfileAction().catch(console.error)
}

export async function skipAlbumAction(id: number) {
  await db.album.update({ where: { id }, data: { status: 'skipped' } })
  revalidatePath('/albums')
}

// ── taste profile ─────────────────────────────────────────────────────────────

export async function updateTasteProfileAction() {
  const listened = await db.album.findMany({
    where: { status: 'listened' },
    orderBy: { listenedAt: 'desc' },
  })
  if (!listened.length) return

  await db.tasteProfile.upsert({ where: { id: 1 }, create: { isUpdating: true }, update: { isUpdating: true } })

  const lines = listened.map(a => {
    const parts = [`${a.artist} — ${a.title}`]
    if (a.year) parts.push(`(${a.year})`)
    if (a.rating) parts.push(`Rating: ${a.rating}/10`)
    if (a.notes) parts.push(`Notes: ${a.notes}`)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `Analyse this listener's album ratings and generate an updated music taste profile for their AI curator.\n\nListening history (most recent first):\n${lines}\n\nReturn ONLY this JSON object, no markdown:\n{\n  "summary": "2-3 paragraph prose in second person describing their taste",\n  "favorite_genres": ["..."],\n  "favorite_artists": ["..."],\n  "preferred_decades": ["..."],\n  "mood_preferences": ["..."],\n  "disliked_patterns": ["..."]\n}`

  const data = await callClaudeJson<Record<string, unknown>>(prompt, { model: OPUS })

  await db.tasteProfile.upsert({
    where: { id: 1 },
    create: {
      summary: data.summary ?? '',
      favoriteGenres: JSON.stringify(data.favorite_genres ?? []),
      favoriteArtists: JSON.stringify(data.favorite_artists ?? []),
      preferredDecades: JSON.stringify(data.preferred_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      albumsAnalyzed: listened.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
    update: {
      summary: data.summary ?? '',
      favoriteGenres: JSON.stringify(data.favorite_genres ?? []),
      favoriteArtists: JSON.stringify(data.favorite_artists ?? []),
      preferredDecades: JSON.stringify(data.preferred_decades ?? []),
      moodPreferences: JSON.stringify(data.mood_preferences ?? []),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? []),
      albumsAnalyzed: listened.length,
      lastUpdatedAt: new Date(),
      isUpdating: false,
    },
  })

  revalidatePath('/albums/profile')
}

export async function addProfileContextAction(context: string) {
  const profile = await db.tasteProfile.findFirst()
  if (!profile) return

  const g = parseJson<string[]>(profile.favoriteGenres, [])
  const a = parseJson<string[]>(profile.favoriteArtists, [])
  const d = parseJson<string[]>(profile.preferredDecades, [])
  const m = parseJson<string[]>(profile.moodPreferences, [])
  const x = parseJson<string[]>(profile.dislikedPatterns, [])

  const prompt = `You are updating a music taste profile for an AI curator.\n\nCurrent profile:\nSummary: ${profile.summary}\nGenres: ${g.join(', ') || 'none'}\nArtists: ${a.join(', ') || 'none'}\nEras: ${d.join(', ') || 'none'}\nMoods: ${m.join(', ') || 'none'}\nDislikes: ${x.join(', ') || 'none'}\n\nThe listener has added:\n"${context}"\n\nUpdate the full profile incorporating the new information.\n\nReturn ONLY this JSON (no markdown):\n{\n  "summary": "updated 2-3 paragraph prose in second person",\n  "favorite_genres": ["updated list"],\n  "favorite_artists": ["updated list"],\n  "preferred_decades": ["updated list"],\n  "mood_preferences": ["updated list"],\n  "disliked_patterns": ["updated list"]\n}`

  const data = await callClaudeJson<Record<string, unknown>>(prompt, { model: OPUS })

  await db.tasteProfile.update({
    where: { id: profile.id },
    data: {
      summary: data.summary ?? profile.summary,
      favoriteGenres: JSON.stringify(data.favorite_genres ?? g),
      favoriteArtists: JSON.stringify(data.favorite_artists ?? a),
      preferredDecades: JSON.stringify(data.preferred_decades ?? d),
      moodPreferences: JSON.stringify(data.mood_preferences ?? m),
      dislikedPatterns: JSON.stringify(data.disliked_patterns ?? x),
      lastUpdatedAt: new Date(),
    },
  })

  revalidatePath('/albums/profile')
}

export async function saveProfileSetupAction(formData: FormData) {
  const parse = (val: string | null) =>
    (val ?? '').split(',').map(s => s.trim()).filter(Boolean)

  const genres = parse(formData.get('genres') as string)
  const artists = parse(formData.get('artists') as string)
  const decades = formData.getAll('decades') as string[]
  const moods = parse(formData.get('moods') as string)
  const summary = (formData.get('summary') as string) ?? ''

  await db.tasteProfile.upsert({
    where: { id: 1 },
    create: {
      summary,
      favoriteGenres: JSON.stringify(genres),
      favoriteArtists: JSON.stringify(artists),
      preferredDecades: JSON.stringify(decades),
      moodPreferences: JSON.stringify(moods),
      dislikedPatterns: '[]',
      isUpdating: true,
    },
    update: {
      summary,
      favoriteGenres: JSON.stringify(genres),
      favoriteArtists: JSON.stringify(artists),
      preferredDecades: JSON.stringify(decades),
      moodPreferences: JSON.stringify(moods),
      isUpdating: true,
    },
  })

  revalidatePath('/albums/profile')
  await updateTasteProfileAction()
}

// ── recommendations ───────────────────────────────────────────────────────────

export async function generateRecommendationsAction(prompt: string, tasteWeight = 100) {
  const weight = Math.max(0, Math.min(100, tasteWeight))
  const profile = await db.tasteProfile.findFirst()

  const ratedAlbums = await db.album.findMany({
    where: { status: 'listened' },
    orderBy: { listenedAt: 'desc' },
    select: { artist: true, title: true },
  })
  const ratedKeys = new Set(ratedAlbums.map(a => `${a.artist.toLowerCase()}|${a.title.toLowerCase()}`))

  const historyArtistsArr = ratedAlbums
    .slice(0, 20)
    .map(a => a.artist)
    .filter((v, i, arr) => arr.indexOf(v) === i)
  const historyArtists = historyArtistsArr.join(', ')

  const recentArtists = (await db.album.findMany({
    where: { batchId: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: { artist: true },
  })).map(a => a.artist).filter((v, i, arr) => arr.indexOf(v) === i).join(', ')

  const request = prompt.trim() || "Surprise me — pick whatever you think I'd love most right now."

  // The taste-profile slider controls how strongly the listener's history should steer
  // picks — low values mean "surprise me, ignore my usual patterns."
  const pSection = weight >= 15 ? profileSection(profile) : 'Ignored per listener preference for this batch — favor exploring outside their usual taste.'
  const tasteGuidance = weight >= 70
    ? "Lean heavily on the listener's taste profile below — most picks should clearly fit it."
    : weight >= 30
    ? "Use the listener's taste profile below as a loose guide, but don't let it override the request — prioritize variety and the explicit request over strict profile fit."
    : "Mostly ignore the listener's taste profile below — favor exploring outside their usual patterns and prioritize the explicit request."

  // Ground Pass 1 in real "fans of X also like Y" data from a couple of known-liked
  // seed artists, so suggestions aren't purely the LLM's own parametric memory.
  // This is inspiration, not a hard restriction — Claude can still pick outside it
  // when the request calls for something unrelated to past taste. Skipped at low taste
  // weight since it's itself a taste-profile-driven signal.
  const favoriteArtists = parseJson<string[]>(profile?.favoriteArtists ?? '[]', [])
  const seedArtists = weight >= 30 ? (favoriteArtists.length ? favoriteArtists : historyArtistsArr).slice(0, 3) : []
  const similarPool = (await Promise.all(seedArtists.map(a => getSimilarArtists(a, 8))))
    .flat()
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .filter(a => !historyArtistsArr.some(h => h.toLowerCase() === a.toLowerCase()))
    .slice(0, 15)
    .join(', ')

  // If the request names a specific artist, get Last.fm similar-artist data for them
  // directly — this is the primary signal for "like X" requests.
  let requestAnchorArtist: string | null = null
  let requestAnchorPool = ''
  if (request !== "Surprise me — pick whatever you think I'd love most right now.") {
    const extraction = await callClaudeJson<{ artist: string | null }>(
      `Extract the primary artist name from this music request. Return null if no specific artist is named.\n\nRequest: "${request}"\n\nReturn ONLY valid JSON, no markdown: {"artist": "Artist Name"} or {"artist": null}`,
      { model: HAIKU, maxTokens: 64 }
    ).catch(() => ({ artist: null }))
    if (extraction.artist) {
      requestAnchorArtist = extraction.artist
      const anchorSimilar = await getSimilarArtists(extraction.artist, 15)
      requestAnchorPool = anchorSimilar
        .filter(a => !historyArtistsArr.some(h => h.toLowerCase() === a.toLowerCase()))
        .slice(0, 15)
        .join(', ')
    }
  }

  // Pass 1: pick artists
  const p1 = `You are an expert music curator. Based on this listener's taste profile and current request, choose 5 artists whose work they would love.\n\n## Listener's Taste Profile\n${pSection}\n(${tasteGuidance})\n\n${historyArtists ? `## Already listened to (do not suggest these artists again)\n${historyArtists}\n\n` : ''}${recentArtists ? `## Recently recommended (avoid repeating these artists)\n${recentArtists}\n\n` : ''}${requestAnchorPool ? `## Artists similar to ${requestAnchorArtist} (the artist they specifically mentioned — Last.fm real data, start here)\n${requestAnchorPool}\n\n` : similarPool ? `## Real artists similar to ones they already like (optional inspiration)\n${similarPool}\n\n` : ''}## Their Request\n"${request}"\n\nRules:\n- If the request states a hard constraint (a release year/decade cutoff, energy level, mood, etc.), treat it as a strict requirement, not a vibe — every pick must actually satisfy it\n- 5 different artists, no duplicates\n- Vary the suggestions — don't cluster around one sub-genre\n- The reason should be 2-3 sentences specific to this listener's taste\n- If you swap an artist for a related one (e.g. because the first is already listened to), the "artist" field must be the swapped-to artist, not the original\n\nReturn ONLY a JSON array of 5 objects, no markdown:\n[{"artist": "Artist Name", "reason": "Why this fits..."}]`

  const artistPicks = await callClaudeJson<{ artist: string; reason: string }[]>(p1, { model: OPUS })

  const batch = await db.recommendationBatch.create({ data: { prompt: prompt || null } })

  await db.recommendationLog.create({
    data: {
      batchId: batch.id,
      level: 'info',
      event: 'pass1_artists',
      detail: JSON.stringify({ prompt: prompt || '(none)', tasteWeight: weight, count: artistPicks.length, artists: artistPicks, anchorArtist: requestAnchorArtist, anchorPoolUsed: requestAnchorPool || '(none)', similarPoolUsed: similarPool || '(none)' }),
    },
  })

  if (!artistPicks.length) {
    await db.recommendationLog.create({
      data: { batchId: batch.id, level: 'error', event: 'batch_complete', detail: JSON.stringify({ saved: 0, error: 'Pass 1 returned no artists' }) },
    })
    return batch.id
  }

  // Ground Pass 2 in each artist's real discography via Last.fm, so the album pick
  // has to be a title that actually exists rather than a name recalled from memory.
  // Each title carries a verified release year (from Last.fm tags/wiki) so a decade or
  // year constraint can be checked against real data instead of Opus's memory of the era.
  // Falls back to free-form naming only when Last.fm has no data for that artist.
  const topAlbumsByArtist = await Promise.all(artistPicks.map(a => getTopAlbumsWithYears(a.artist, 10)))
  const artistList = artistPicks.map((a, i) => {
    const albums = topAlbumsByArtist[i]
    return albums.length
      ? `- ${a.artist}\n  Available albums (pick ONE of these exactly, do not invent a different title) — verified release year in parentheses, "year unknown" means we couldn't confirm one:\n  ${albums.map(al => `${al.title} (${al.year ?? 'year unknown'})`).join(', ')}`
      : `- ${a.artist}\n  (no verified discography found — use your best knowledge, but only if you are certain the album exists)`
  }).join('\n')

  // Pass 2: pick albums
  const tasteSummary = profile?.summary ? `\n\nListener taste summary: ${profile.summary.slice(0, 300)}` : ''
  const p2 = `For each artist below, name the single album that would best suit this listener.\n\nTheir request: "${request}"${tasteSummary}\n\nArtists:\n${artistList}\n\nCRITICAL:\n- When an artist has an "Available albums" list, your answer MUST be one of those exact titles — never invent a different one.\n- When no list is given, use the exact album title as it appears in music databases, and only name an album you are certain exists.\n- If the request states a hard constraint (a release year/decade cutoff, energy level, mood, etc.), the album you pick MUST actually satisfy it. The year in parentheses next to each title is verified — trust it over your own memory of the album's era. Only pick a "year unknown" album against a year/decade constraint if you are independently certain of its era and no dated album in the list qualifies. Do not default to an artist's best-known or classic album if it violates the constraint; pick a different, qualifying album from the list instead.\n\nReturn ONLY a JSON array (one object per artist), no markdown:\n[{"artist": "Artist Name", "title": "Exact Album Title", "year": 2017, "genre": "Genre"}]`

  const suggestions = await callClaudeJson<{ artist: string; title: string; year?: number; genre?: string }[]>(p2, { model: OPUS })
  const reasonMap = new Map(artistPicks.map(a => [a.artist.toLowerCase(), a.reason]))

  await db.recommendationLog.create({
    data: { batchId: batch.id, level: 'info', event: 'pass2_albums', detail: JSON.stringify({ count: suggestions.length, suggestions, groundedArtists: artistPicks.filter((_, i) => topAlbumsByArtist[i].length).map(a => a.artist) }) },
  })

  let saved = 0
  for (const s of suggestions) {
    if (saved >= 3) break
    const meta = await enrichAlbumMetadata(s.artist, s.title)
    const noMatch = !meta

    if (noMatch) {
      await db.recommendationLog.create({
        data: {
          batchId: batch.id,
          level: 'warn',
          event: 'album_skipped',
          detail: JSON.stringify({ claude_artist: s.artist, claude_title: s.title, reason: 'no_metadata_match' }),
        },
      })
      continue
    }

    if (ratedKeys.has(`${meta.artist.toLowerCase()}|${meta.title.toLowerCase()}`)) {
      await db.recommendationLog.create({
        data: {
          batchId: batch.id,
          level: 'warn',
          event: 'album_skipped',
          detail: JSON.stringify({ claude_artist: s.artist, claude_title: s.title, reason: 'already_rated' }),
        },
      })
      continue
    }

    const spotifyMatch = await getSpotifyAlbumMatch(meta.artist, meta.title)

    if (!spotifyMatch) {
      await db.recommendationLog.create({
        data: {
          batchId: batch.id,
          level: 'warn',
          event: 'album_skipped',
          detail: JSON.stringify({ claude_artist: s.artist, claude_title: s.title, reason: 'no_spotify_match' }),
        },
      })
      continue
    }

    if (spotifyMatch.isSingle) {
      await db.recommendationLog.create({
        data: {
          batchId: batch.id,
          level: 'warn',
          event: 'album_skipped',
          detail: JSON.stringify({ claude_artist: s.artist, claude_title: s.title, reason: 'single' }),
        },
      })
      continue
    }

    await db.recommendationLog.create({
      data: {
        batchId: batch.id,
        level: 'info',
        event: 'album_saved',
        detail: JSON.stringify({ claude_artist: s.artist, claude_title: s.title, matched: true }),
      },
    })

    await db.album.create({
      data: {
        batchId: batch.id,
        title: meta.title,
        artist: meta.artist,
        year: meta.year,
        genre: meta.genre,
        artworkUrl: meta.artworkUrl,
        itunesId: meta.itunesId,
        spotifyUrl: spotifyMatch.url,
        recommendedReason: reasonMap.get(s.artist.toLowerCase()) ?? null,
        status: 'recommended',
      },
    })
    saved++
  }

  await db.recommendationLog.create({
    data: {
      batchId: batch.id,
      level: saved < 3 ? 'warn' : 'info',
      event: 'batch_complete',
      detail: JSON.stringify({ saved, of_candidates: suggestions.length }),
    },
  })

  revalidatePath('/albums')
  return batch.id
}
