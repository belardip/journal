import { callClaude, callClaudeJson } from '@/lib/ai'
import { db } from '@/lib/db'

export async function runProfileUpdate(entryId: number) {
  const recentEntries = await db.journalEntry.findMany({
    where: { sessionComplete: true },
    orderBy: { date: 'desc' },
    take: 20,
    include: { messages: { orderBy: { order: 'asc' } } },
  })

  if (recentEntries.length === 0) return

  const profile = await db.userProfile.findFirst()

  const entriesText = recentEntries
    .map(entry => {
      const chat = entry.messages.map(m => `${m.role}: ${m.content}`).join('\n')
      const d = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
      return `--- ${d} ---\nJournal: ${entry.content}\n\nChat:\n${chat}`
    })
    .join('\n\n')

  const existingProfile = profile?.summary
    ? `Existing profile:\n${profile.summary}`
    : 'No existing profile yet.'

  const profilePrompt =
    'You are analyzing a person\'s journal entries and conversations to build a psychological profile for their AI journal companion.\n\n' +
    existingProfile + '\n\n' +
    'Here are the most recent journal sessions (newest first):\n\n' +
    entriesText + '\n\n' +
    'Based on ALL of the above, generate an updated profile in this exact JSON format:\n' +
    '{\n' +
    '  "summary": "2-3 paragraph prose overview of this person",\n' +
    '  "recurring_themes": ["theme1", "theme2"],\n' +
    '  "behavioral_patterns": ["pattern1", "pattern2"],\n' +
    '  "mood_trends": ["trend1", "trend2"],\n' +
    '  "goals_mentioned": ["goal1", "goal2"],\n' +
    '  "people_mentioned": ["Name (relationship/context)"],\n' +
    '  "advice": ["specific actionable thing to try, grounded in their patterns and goals"]\n' +
    '}\n\n' +
    'For advice: 3-5 concrete, specific suggestions based on what the journal reveals — things to try, habits to build, conversations to have, patterns to interrupt. Make them feel personal, not generic. Be specific and grounded in actual evidence from their writing. Return ONLY the JSON object, no other text.'

  console.log(`[profile] starting update for entry ${entryId}`)
  let profileData: Record<string, unknown>
  try {
    profileData = await callClaudeJson<Record<string, unknown>>(profilePrompt, { maxTokens: 2048 })
  } catch (e) {
    console.error('[profile] profile synthesis failed:', e)
    return
  }
  console.log(`[profile] synthesis done`)

  const profileAttributes = {
    summary: (profileData.summary as string) ?? '',
    recurringThemes: JSON.stringify(profileData.recurring_themes ?? []),
    behavioralPatterns: JSON.stringify(profileData.behavioral_patterns ?? []),
    moodTrends: JSON.stringify(profileData.mood_trends ?? []),
    goalsMentioned: JSON.stringify(profileData.goals_mentioned ?? []),
    peopleMentioned: JSON.stringify(profileData.people_mentioned ?? []),
    advice: JSON.stringify(profileData.advice ?? []),
    entriesAnalyzed: recentEntries.length,
    lastUpdatedAt: new Date(),
  }

  if (profile) {
    await db.userProfile.update({ where: { id: profile.id }, data: profileAttributes })
  } else {
    await db.userProfile.create({ data: profileAttributes })
  }

  // Update entry mood/summary/themes
  const triggerEntry = await db.journalEntry.findUnique({ where: { id: entryId } })
  if (!triggerEntry) return

  const metaPrompt =
    'Based on this journal entry, respond with ONLY a JSON object (no markdown, no explanation):\n' +
    '{"mood": "one word", "mood_score": 1-10, "summary": "2 sentences", "themes": ["theme1", "theme2"]}\n\n' +
    `Entry:\n${triggerEntry.content}`

  try {
    const meta = await callClaudeJson<{ mood?: string; mood_score?: number; summary?: string; themes?: string[] }>(metaPrompt, { maxTokens: 512 })
    await db.journalEntry.update({
      where: { id: entryId },
      data: {
        mood: meta.mood ?? null,
        moodScore: meta.mood_score ?? null,
        summary: meta.summary ?? null,
        themes: JSON.stringify(meta.themes ?? []),
      },
    })
    console.log(`[profile] entry meta done (mood: ${meta.mood}, score: ${meta.mood_score})`)
  } catch (e) { console.error('[profile] entry meta failed:', e) }

  try {
    const [updatedEntry, updatedProfile] = await Promise.all([
      db.journalEntry.findUnique({ where: { id: entryId } }),
      db.userProfile.findFirst(),
    ])
    if (updatedEntry && updatedProfile?.summary) {
      const patterns = (() => { try { return JSON.parse(updatedProfile.behavioralPatterns) as string[] } catch { return [] as string[] } })()
      const moodTrends = (() => { try { return JSON.parse(updatedProfile.moodTrends) as string[] } catch { return [] as string[] } })()
      const themes = (() => { try { return JSON.parse(updatedEntry.themes) as string[] } catch { return [] as string[] } })()

      const obsPrompt = `You are reading someone's most recent journal entry alongside their established profile.

THEIR PROFILE SUMMARY:
${updatedProfile.summary}
${patterns.length ? `Behavioral patterns: ${patterns.join('; ')}` : ''}
${moodTrends.length ? `Mood trends: ${moodTrends.join('; ')}` : ''}

MOST RECENT ENTRY (${updatedEntry.date}${updatedEntry.timeOfDay ? `, ${updatedEntry.timeOfDay}` : ''}):
${updatedEntry.content}
${updatedEntry.mood ? `Mood: ${updatedEntry.mood}${updatedEntry.moodScore ? ` (${updatedEntry.moodScore}/10)` : ''}` : ''}
${themes.length ? `Themes: ${themes.join(', ')}` : ''}

Write 3–4 sharp observations about this specific entry. Reference what they actually wrote. Focus on:
- What's consistent or inconsistent with their usual patterns
- Any shift in tone, mood, or preoccupations vs their baseline
- What this entry reveals that the broader summary might not capture yet

Be specific and direct. No generic advice. No hedging. No cheerfulness.`

      const observations = await callClaude(obsPrompt, { maxTokens: 500 })
      await db.journalEntry.update({ where: { id: entryId }, data: { observations } })
      console.log(`[profile] observations done`)
    }
  } catch (e) { console.error('[profile] observations failed:', e) }
  console.log(`[profile] update complete for entry ${entryId}`)
}
