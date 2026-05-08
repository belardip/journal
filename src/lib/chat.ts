import type { JournalEntry, ChatMessage, UserProfile } from '@/generated/prisma/client'

export function buildChatSystemPrompt(profile: UserProfile | null): string {
  let profileSection = ''

  if (profile?.summary) {
    const formatList = (json: string) => {
      try {
        const items = JSON.parse(json) as string[]
        if (!items.length) return '(none yet)'
        return items.map(i => `- ${i}`).join('\n')
      } catch {
        return '(none yet)'
      }
    }

    const lastUpdated = profile.lastUpdatedAt
      ? new Date(profile.lastUpdatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : null

    profileSection =
      `\n\n## What I Know About You (Running Profile)\n` +
      profile.summary + '\n\n' +
      `### Recurring Themes\n${formatList(profile.recurringThemes)}\n\n` +
      `### Behavioral Patterns\n${formatList(profile.behavioralPatterns)}\n\n` +
      `### Mood Trends\n${formatList(profile.moodTrends)}\n\n` +
      `### Goals You've Mentioned\n${formatList(profile.goalsMentioned)}\n\n` +
      `### People in Your Life\n${formatList(profile.peopleMentioned)}\n\n` +
      `(Profile based on ${profile.entriesAnalyzed} journal entries.` +
      (lastUpdated ? ` Last updated: ${lastUpdated}.` : '') + ')'
  }

  return (
    'You are a warm, perceptive personal journal companion. Your role is to help the user reflect deeply on their experiences, emotions, and patterns.\n\n' +
    '## Your Approach\n' +
    '- Ask one focused follow-up question that helps the user go deeper, not wider\n' +
    '- Notice emotional undercurrents and gently name them (e.g. "It sounds like there might be some frustration underneath that...")\n' +
    '- Connect today\'s entry to patterns you\'ve noticed over time (use the profile when it exists)\n' +
    '- Celebrate progress. Validate struggle. Never judge.\n' +
    '- Keep responses concise — 2-4 sentences followed by one focused question\n' +
    '- Do NOT give advice unless explicitly asked. Reflect and inquire first.\n' +
    '- Use the user\'s own words back to them when useful\n' +
    '- If the user mentions someone by name, remember them in this conversation\n' +
    profileSection + '\n\n' +
    '## Today\'s Session\n' +
    'The user has just shared their journal entry. Begin by acknowledging what they wrote and asking one question that opens the most interesting thread.'
  )
}

export function buildChatMessages(
  entry: JournalEntry,
  messages: Pick<ChatMessage, 'role' | 'content'>[],
): { role: 'user' | 'assistant'; content: string }[] {
  if (messages.length === 0) {
    const dateStr = formatEntryDate(entry.date)
    return [{
      role: 'user',
      content: `Here is my journal entry for today (${dateStr}):\n\n${entry.content}`,
    }]
  }

  return messages.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
}

export function formatEntryDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
