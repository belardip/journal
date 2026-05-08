import 'dotenv/config'
import { createClient } from '@libsql/client'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// Source: Laravel journal SQLite
const src = createClient({ url: 'file:C:/laragon/www/journal/database/database.sqlite' })

// Destination: journal-next SQLite
// Note: Prisma stores columns as camelCase (timeOfDay, sessionComplete, etc.)
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  // Wipe existing data
  await db.$executeRawUnsafe('DELETE FROM chat_messages')
  await db.$executeRawUnsafe('DELETE FROM journal_entries')
  await db.$executeRawUnsafe('DELETE FROM user_profiles')

  // ── Journal entries ─────────────────────────────────────────────────────────
  const { rows: entries } = await src.execute('SELECT * FROM journal_entries ORDER BY id')

  for (const row of entries) {
    const rawDate = String(row.entry_date ?? '')
    const date = rawDate.split(' ')[0]

    await db.$executeRawUnsafe(
      `INSERT INTO journal_entries (id, date, timeOfDay, content, mood, moodScore, summary, themes, sessionComplete, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      Number(row.id),
      date,
      row.time_of_day ?? null,
      String(row.content),
      row.mood ?? null,
      row.mood_score != null ? Number(row.mood_score) : null,
      row.summary ?? null,
      row.themes ?? '[]',
      row.session_complete ? 1 : 0,
      row.created_at ?? new Date().toISOString(),
    )
  }

  console.log(`✓ Migrated ${entries.length} journal entries`)

  // ── Chat messages ────────────────────────────────────────────────────────────
  // Source FK column is "journal_entry_id"; dest camelCase column is "entryId"
  const { rows: messages } = await src.execute('SELECT * FROM chat_messages ORDER BY id')

  for (const row of messages) {
    await db.$executeRawUnsafe(
      `INSERT INTO chat_messages (id, entryId, role, content, "order", createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      Number(row.id),
      Number(row['journal_entry_id']),
      String(row.role),
      String(row.content),
      Number(row['order'] ?? 0),
      row.created_at ?? new Date().toISOString(),
    )
  }

  console.log(`✓ Migrated ${messages.length} chat messages`)

  // ── User profile ─────────────────────────────────────────────────────────────
  const { rows: profiles } = await src.execute('SELECT * FROM user_profiles LIMIT 1')
  const toJson = (val: unknown) => {
    if (!val) return '[]'
    const str = String(val)
    return str.startsWith('[') ? str : '[]'
  }

  if (profiles.length > 0) {
    const p = profiles[0]
    await db.$executeRawUnsafe(
      `INSERT INTO user_profiles (summary, recurringThemes, behavioralPatterns, moodTrends, goalsMentioned, peopleMentioned, entriesAnalyzed, lastUpdatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      p.summary ?? null,
      toJson(p.recurring_themes),
      toJson(p.behavioral_patterns),
      toJson(p.mood_trends),
      toJson(p.goals_mentioned),
      toJson(p.people_mentioned),
      p.entries_analyzed ? Number(p.entries_analyzed) : 0,
      p.last_updated_at ?? null,
    )
    console.log('✓ Migrated user profile')
  } else {
    await db.$executeRawUnsafe(
      `INSERT INTO user_profiles (summary, recurringThemes, behavioralPatterns, moodTrends, goalsMentioned, peopleMentioned, entriesAnalyzed)
       VALUES (null, '[]', '[]', '[]', '[]', '[]', 0)`
    )
    console.log('✓ Created empty user profile')
  }

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
