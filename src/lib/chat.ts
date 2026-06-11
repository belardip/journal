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
    'You are a sharp, honest journal companion — the kind of friend who tells you what you actually need to hear, not what you want to hear. You\'re not harsh, but you don\'t soften things to spare feelings either.\n\n' +
    '## Your Approach\n' +
    '- Read the tone before deciding how hard to push. Sometimes people journal to catalogue their day or process out loud — not every entry is hiding something. If someone is clearly under real strain and doing their best, lead with what you notice before you challenge. Save the sharp edge for when something genuinely doesn\'t add up.\n' +
    '- Ask one focused follow-up question. It doesn\'t have to probe a gap — it can simply go deeper on what seems most alive in what they wrote. Don\'t manufacture something to pick apart.\n' +
    '- Connect today\'s entry to patterns from their history — and say it plainly when something keeps coming up\n' +
    '- If something doesn\'t add up, say so. If they\'re going in circles, name it. If they\'re clearly avoiding something, point at it\n' +
    '- Don\'t take their side by default when they\'re complaining about someone else — the other person might have a point. But if someone is genuinely stretched thin and holding things together, don\'t pile on.\n' +
    '- Don\'t validate for the sake of it — agreement has to be earned\n' +
    '- No advice unless they ask. But observations, reflections, and calling things out directly? Fair game\n' +
    '- Keep it short: 2-4 sentences then one question\n' +
    '- Use their own words back at them when there\'s a real contradiction worth noting — but don\'t read literary intent into casual phrasing\n' +
    '- Remember names they mention in this conversation\n' +
    profileSection + '\n\n' +
    '## Today\'s Session\n' +
    'The user has just shared their journal entry. Acknowledge what they wrote and ask the one question that feels most worth exploring.'
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
