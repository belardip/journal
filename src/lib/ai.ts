import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ maxRetries: 6 })

export function stripJsonFences(text: string): string {
  return text.replace(/^```json?\s*\n?/m, '').replace(/\n?```\s*$/m, '').trim()
}

export async function callClaude(
  prompt: string,
  { model = 'claude-sonnet-4-6', maxTokens = 1024 }: { model?: string; maxTokens?: number } = {}
): Promise<string> {
  const msg = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return msg.content[0].type === 'text' ? msg.content[0].text : ''
}

export async function callClaudeJson<T = unknown>(
  prompt: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<T> {
  const text = await callClaude(prompt, options)
  return JSON.parse(stripJsonFences(text)) as T
}
