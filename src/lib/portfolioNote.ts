import { callClaude } from '@/lib/ai'
import { db } from '@/lib/db'

type Message = { role: 'user' | 'assistant'; content: string }

const MEMORY_PREAMBLE =
  'You maintain a running memory of a user\'s ongoing conversations with their portfolio advisor AI, so future conversations can pick up where they left off instead of starting from scratch. ' +
  'This is a living summary you update in place, not a log you append to — always rewrite it from scratch each time, keeping only what\'s still relevant and dropping anything superseded or outdated. ' +
  'Hard limit: 1-2 short paragraphs, no matter how much history has accumulated. If it\'s already at that limit, something has to be cut or condensed to fit new information in.'

async function mergeSummary(existingSummary: string, prompt: string): Promise<string> {
  const summary = await callClaude(prompt, { maxTokens: 600 })
  const trimmed = summary.trim()
  if (!trimmed) return existingSummary

  const note = await db.portfolioNote.findFirst()
  if (note) {
    await db.portfolioNote.update({ where: { id: note.id }, data: { summary: trimmed, lastUpdatedAt: new Date() } })
  } else {
    await db.portfolioNote.create({ data: { summary: trimmed, lastUpdatedAt: new Date() } })
  }
  return trimmed
}

export async function updatePortfolioNoteFromChat(messages: Message[]) {
  const note = await db.portfolioNote.findFirst()
  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n\n')
  const existing = note?.summary ? `Existing summary:\n${note.summary}` : 'No existing summary yet.'

  const prompt =
    `${MEMORY_PREAMBLE}\n\n` +
    existing + '\n\n' +
    'Here is their latest exchange with the advisor:\n\n' + conversationText + '\n\n' +
    'Write the updated summary (1-2 short paragraphs max) covering: why they hold specific stocks (their stated reasoning), their risk tolerance and goals, decisions made or being weighed, and any other durable context worth remembering — plus the general gist of what you two have been discussing. Merge in anything new from this exchange, drop anything superseded, no headers, no bullet points, no markdown. Return ONLY the paragraph(s), nothing else.'

  try {
    await mergeSummary(note?.summary ?? '', prompt)
  } catch (e) {
    console.error('[portfolio-note] chat update failed:', e)
  }
}

export async function addNoteToPortfolioSummary(noteText: string): Promise<string> {
  const note = await db.portfolioNote.findFirst()
  const existing = note?.summary ? `Existing summary:\n${note.summary}` : 'No existing summary yet.'

  const prompt =
    `${MEMORY_PREAMBLE}\n\n` +
    existing + '\n\n' +
    `The user just added this note directly (not from a chat message): "${noteText.trim()}"\n\n` +
    'Write the updated summary (1-2 short paragraphs max) that folds this note in as authoritative — correcting or extending the existing summary as needed — while keeping everything else that\'s still relevant. No headers, no bullet points, no markdown. Return ONLY the paragraph(s), nothing else.'

  return mergeSummary(note?.summary ?? '', prompt)
}
