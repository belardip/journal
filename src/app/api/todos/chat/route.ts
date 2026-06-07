import { anthropic } from '@/lib/ai'
import { db } from '@/lib/db'
import { buildTodoSystemPrompt } from '@/lib/todos-chat'
import { cookies } from 'next/headers'
import { getSessionToken } from '@/lib/session'

const MAX_HISTORY = 20

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const jar = await cookies()
    const sessionToken = await getSessionToken()
    if (jar.get('www_auth')?.value !== sessionToken) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const { message } = await req.json() as { message: string }

  if (!message?.trim()) {
    return new Response('Bad request', { status: 400 })
  }

  const [todos, history] = await Promise.all([
    db.todo.findMany({ orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'asc' }] }),
    db.todoChatMessage.findMany({ orderBy: { order: 'asc' }, take: MAX_HISTORY }),
  ])

  const order = history.length

  await db.todoChatMessage.create({
    data: { role: 'user', content: message, order },
  })

  const systemPrompt = buildTodoSystemPrompt(todos)

  const chatMessages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  const encoder = new TextEncoder()
  let fullResponse = ''

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: systemPrompt,
          messages: chatMessages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`))
          }
        }

        await db.todoChatMessage.create({
          data: { role: 'assistant', content: fullResponse, order: order + 1 },
        })

        // Keep chat history from growing unbounded
        const totalCount = await db.todoChatMessage.count()
        if (totalCount > MAX_HISTORY + 10) {
          const oldest = await db.todoChatMessage.findMany({
            orderBy: { order: 'asc' },
            take: totalCount - MAX_HISTORY,
          })
          if (oldest.length) {
            await db.todoChatMessage.deleteMany({
              where: { id: { in: oldest.map(m => m.id) } },
            })
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } catch (e) {
        console.error('Todos chat stream error:', e)
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

export async function DELETE() {
  await db.todoChatMessage.deleteMany()
  return new Response(null, { status: 204 })
}
