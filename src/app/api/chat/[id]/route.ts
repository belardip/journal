import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'
import { buildChatSystemPrompt, buildChatMessages } from '@/lib/chat'

const anthropic = new Anthropic()

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entryId = parseInt(id)
  const { message } = await req.json() as { message: string }

  if (!message?.trim()) {
    return new Response('Bad request', { status: 400 })
  }

  const entry = await db.journalEntry.findUnique({
    where: { id: entryId },
    include: { messages: { orderBy: { order: 'asc' } } },
  })

  if (!entry) return new Response('Not found', { status: 404 })

  const order = entry.messages.length

  await db.chatMessage.create({
    data: { entryId, role: 'user', content: message, order },
  })

  const allMessages = [...entry.messages, { role: 'user', content: message, order }]
  const profile = await db.userProfile.findFirst()

  const systemPrompt = buildChatSystemPrompt(profile)
  const chatMessages = buildChatMessages(entry, allMessages)

  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: chatMessages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`))
          }
        }

        await db.chatMessage.create({
          data: { entryId, role: 'assistant', content: fullResponse, order: order + 1 },
        })

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } catch (e) {
        console.error('Chat stream error:', e)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Something went wrong' })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })
}
