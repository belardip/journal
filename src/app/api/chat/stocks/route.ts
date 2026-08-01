import { anthropic } from '@/lib/ai'
import { db } from '@/lib/db'
import { getQuotes } from '@/lib/stocks'
import { cookies } from 'next/headers'
import { getSessionToken } from '@/lib/session'

type Message = { role: 'user' | 'assistant'; content: string }

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const jar = await cookies()
    const sessionToken = await getSessionToken()
    if (jar.get('www_auth')?.value !== sessionToken) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  const { message, messages } = await req.json() as { message: string; messages: Message[] }

  if (!message?.trim()) {
    return new Response('Bad request', { status: 400 })
  }

  const holdings = await db.stockHolding.findMany({ orderBy: { addedAt: 'asc' } })

  let portfolioContext = 'The user has no holdings yet.'

  if (holdings.length > 0) {
    const quotes = await getQuotes(holdings.map(h => h.ticker))

    const rows = holdings.map(h => {
      const q = quotes.find(q => q.ticker === h.ticker)
      const price = q?.price ?? 0
      const name = q?.name ?? h.ticker
      const marketValue = price * h.shares
      const costBasis = h.avgPrice * h.shares
      const gainLoss = marketValue - costBasis
      const gainLossPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      return { ticker: h.ticker, name, shares: h.shares, avgPrice: h.avgPrice, price, marketValue, costBasis, gainLoss, gainLossPct }
    })

    const totalValue = rows.reduce((s, r) => s + r.marketValue, 0)
    const totalCost = rows.reduce((s, r) => s + r.costBasis, 0)
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    const holdingLines = rows.map(r =>
      `- ${r.ticker} (${r.name}): ${r.shares} shares | avg cost $${r.avgPrice.toFixed(2)} | current $${r.price.toFixed(2)} | market value $${r.marketValue.toFixed(2)} | gain/loss ${r.gainLoss >= 0 ? '+' : ''}$${r.gainLoss.toFixed(2)} (${r.gainLossPct >= 0 ? '+' : ''}${r.gainLossPct.toFixed(1)}%)`
    ).join('\n')

    portfolioContext = `Portfolio as of today:

${holdingLines}

Total value: $${totalValue.toFixed(2)}
Total gain/loss: ${totalGainLoss >= 0 ? '+' : ''}$${totalGainLoss.toFixed(2)} (${totalGainLossPct >= 0 ? '+' : ''}${totalGainLossPct.toFixed(1)}%)`
  }

  const systemPrompt = `You are a knowledgeable financial advisor helping the user think through their investment portfolio. Be concise, honest, and helpful. Skip legal disclaimers — just give clear analysis.

${portfolioContext}`

  const allMessages: Message[] = [...messages, { role: 'user', content: message }]

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: allMessages,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk: event.delta.text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
      } catch (e) {
        console.error('Stocks chat error:', e)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: true })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
