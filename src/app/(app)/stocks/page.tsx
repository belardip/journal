import { Suspense } from 'react'
import { db } from '@/lib/db'
import { getQuotes } from '@/lib/stocks'
import { anthropic } from '@/lib/ai'
import { HoldingsList, type HoldingRow } from './holdings-chart'
import { AddHoldingForm } from './add-holding-form'

async function AiSummary({ holdings }: { holdings: HoldingRow[] }) {
  if (holdings.length === 0) return null

  const sorted = [...holdings].sort((a, b) => b.changePercent - a.changePercent)
  const lines = sorted.map(h =>
    `${h.ticker} (${h.name}): $${h.price.toFixed(2)}, ${h.changePercent >= 0 ? '+' : ''}${h.changePercent.toFixed(2)}% today, ${h.gainLossPercent >= 0 ? '+' : ''}${h.gainLossPercent.toFixed(2)}% total gain`
  ).join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    tools: [{ type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `I own these stocks:\n${lines}\n\nSearch the web for recent news on the biggest movers and write me a short plain-English summary (3-5 sentences). No jargon — if you use a financial term, explain it in one phrase. Tell me what's actually driving the moves. Be direct, not cheerful.`,
    }],
  })

  const text = msg.content.find(b => b.type === 'text')?.text ?? ''

  return (
    <div className="rounded-lg border bg-muted/40 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">What&apos;s going on</p>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  )
}

export default async function StocksPage() {
  const holdings = await db.stockHolding.findMany({ orderBy: { addedAt: 'asc' } })

  let rows: HoldingRow[] = []
  if (holdings.length > 0) {
    const quotes = await getQuotes(holdings.map(h => h.ticker))
    rows = holdings.map(h => {
      const q = quotes.find(q => q.ticker === h.ticker)!
      const marketValue = (q?.price ?? 0) * h.shares
      const costBasis = h.avgPrice * h.shares
      const gainLoss = marketValue - costBasis
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
      return {
        ticker: h.ticker,
        name: q?.name ?? h.ticker,
        shares: h.shares,
        avgPrice: h.avgPrice,
        price: q?.price ?? 0,
        change: q?.change ?? 0,
        changePercent: q?.changePercent ?? 0,
        costBasis,
        marketValue,
        gainLoss,
        gainLossPercent,
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Portfolio</h1>
        <AddHoldingForm />
      </div>

      {holdings.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          No stocks yet — add one above.
        </p>
      ) : (
        <>
          <Suspense fallback={
            <div className="rounded-lg border bg-muted/40 px-4 py-3 animate-pulse">
              <div className="h-3 w-24 bg-muted rounded mb-2" />
              <div className="space-y-1.5">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-4/5" />
                <div className="h-3 bg-muted rounded w-3/5" />
              </div>
            </div>
          }>
            <AiSummary holdings={rows} />
          </Suspense>
          <HoldingsList holdings={rows} />
        </>
      )}
    </div>
  )
}
