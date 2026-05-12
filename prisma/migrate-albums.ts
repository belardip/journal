/**
 * Migrate albums data from Laravel albums app SQLite → journal dev.db
 * Run: npx tsx prisma/migrate-albums.ts
 */
import Database from 'better-sqlite3'
import path from 'path'

const SRC = path.resolve('C:/laragon/www/albums/database/database.sqlite')
const DST = path.resolve('./dev.db')

const src = new Database(SRC, { readonly: true })
const dst = new Database(DST)

type SrcBatch = { id: number; prompt: string | null; created_at: string }
type SrcAlbum = {
  id: number; batch_id: number | null; title: string; artist: string
  year: number | null; genre: string | null; artwork_url: string | null
  itunes_id: string | null; status: string; rating: number | null
  notes: string | null; recommended_reason: string | null
  listened_at: string | null; created_at: string
}
type SrcProfile = {
  id: number; summary: string; favorite_genres: string | null
  favorite_artists: string | null; preferred_decades: string | null
  mood_preferences: string | null; disliked_patterns: string | null
  albums_analyzed: number; last_updated_at: string | null
}
type SrcLog = {
  id: number; batch_id: number; level: string; event: string
  detail: string; created_at: string
}

function run() {
  const batches = src.prepare('SELECT * FROM recommendation_batches ORDER BY id').all() as SrcBatch[]
  const albums = src.prepare('SELECT * FROM albums ORDER BY id').all() as SrcAlbum[]
  const profiles = src.prepare('SELECT * FROM taste_profiles ORDER BY id').all() as SrcProfile[]
  const logs = src.prepare('SELECT * FROM recommendation_logs ORDER BY id').all() as SrcLog[]

  console.log(`Source: ${batches.length} batches, ${albums.length} albums, ${profiles.length} profiles, ${logs.length} logs`)

  // Clear destination tables (FK order)
  dst.exec('DELETE FROM recommendation_logs')
  dst.exec('DELETE FROM albums')
  dst.exec('DELETE FROM recommendation_batches')
  dst.exec('DELETE FROM taste_profiles')
  console.log('Cleared destination tables')

  // Migrate batches
  const insertBatch = dst.prepare(
    'INSERT INTO recommendation_batches (id, prompt, createdAt) VALUES (?, ?, ?)'
  )
  for (const b of batches) insertBatch.run(b.id, b.prompt, b.created_at)
  console.log(`Migrated ${batches.length} batches`)

  // Migrate albums
  const insertAlbum = dst.prepare(
    `INSERT INTO albums (id, batchId, title, artist, year, genre, artworkUrl, itunesId, status, rating, notes, recommendedReason, listenedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const a of albums) {
    insertAlbum.run(
      a.id, a.batch_id, a.title, a.artist, a.year, a.genre, a.artwork_url,
      a.itunes_id, a.status, a.rating, a.notes, a.recommended_reason,
      a.listened_at, a.created_at
    )
  }
  console.log(`Migrated ${albums.length} albums`)

  // Migrate taste profiles
  const insertProfile = dst.prepare(
    `INSERT INTO taste_profiles (id, summary, favoriteGenres, favoriteArtists, preferredDecades, moodPreferences, dislikedPatterns, albumsAnalyzed, lastUpdatedAt, isUpdating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
  )
  for (const p of profiles) {
    insertProfile.run(
      p.id, p.summary, p.favorite_genres ?? '[]', p.favorite_artists ?? '[]',
      p.preferred_decades ?? '[]', p.mood_preferences ?? '[]',
      p.disliked_patterns ?? '[]', p.albums_analyzed, p.last_updated_at
    )
  }
  console.log(`Migrated ${profiles.length} taste profiles`)

  // Migrate recommendation logs
  const insertLog = dst.prepare(
    'INSERT INTO recommendation_logs (id, batchId, level, event, detail, createdAt) VALUES (?, ?, ?, ?, ?, ?)'
  )
  for (const l of logs) {
    insertLog.run(l.id, l.batch_id, l.level, l.event, l.detail, l.created_at)
  }
  console.log(`Migrated ${logs.length} logs`)

  src.close()
  dst.close()
  console.log('Done!')
}

run()
