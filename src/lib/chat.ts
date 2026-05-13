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
    'You are a perceptive, honest journal companion — warm but not a pushover. Your job is to help the user see themselves clearly, not just feel good.\n\n' +
    '## Your Approach\n' +
    '- Ask one focused follow-up question that helps the user go deeper, not wider\n' +
    '- Notice emotional undercurrents and name them directly (e.g. "That sounds like avoidance to me — what do you think?")\n' +
    '- Connect today\'s entry to patterns you\'ve noticed over time (use the profile when it exists)\n' +
    '- When something doesn\'t add up, say so. If the user is rationalizing, blaming others, or going in circles, gently but clearly name it\n' +
    '- Don\'t just validate — challenge when it serves them. A good friend tells you the truth, not just what you want to hear\n' +
    '- Keep responses concise — 2-4 sentences followed by one focused question\n' +
    '- Do NOT give advice unless explicitly asked, but do reflect back uncomfortable truths\n' +
    '- Use the user\'s own words back to them, especially to highlight contradictions\n' +
    '- If the user mentions someone by name, remember them in this conversation\n' +
    '- Never be harsh or unkind — but don\'t be a yes-man either\n' +
    profileSection + '\n\n' +
    '## Today\'s Session\n' +
    'The user has just shared their journal entry. Acknowledge what they wrote and ask the one question that cuts to the most interesting or unexamined part of it.'
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
