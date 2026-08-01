export const metadata = { title: 'Portfolio' }

import { db } from '@/lib/db'
import { getQuotes, getStockPerformance } from '@/lib/stocks'
import { HoldingsList, type HoldingRow } from './holdings-chart'
import { AddHoldingForm } from './add-holding-form'
import { AiNewsButton } from './ai-news-button'
import { StocksChat } from './stocks-chat'

export default async function StocksPage() {
  const holdings = await db.stockHolding.findMany({ orderBy: { addedAt: 'asc' } })

  let rows: HoldingRow[] = []
  if (holdings.length > 0) {
    const [quotes, performances] = await Promise.all([
      getQuotes(holdings.map(h => h.ticker)),
      Promise.all(holdings.map(h => getStockPerformance(h.ticker))),
    ])
    rows = holdings.map((h, i) => {
      const q = quotes.find(q => q.ticker === h.ticker)!
      const perf = performances[i]
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
        w1: perf.w1,
        m1: perf.m1,
        m6: perf.m6,
        y1: perf.y1,
      }
    })
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden divide-x">
      {/* Left panel — holdings */}
      <div className="w-96 shrink-0 flex flex-col">
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
          <h1 className="text-base font-semibold">Portfolio</h1>
          <AddHoldingForm />
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-4">
          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              No stocks yet — add one above.
            </p>
          ) : (
            <>
              <AiNewsButton holdings={rows} />
              <HoldingsList holdings={rows} />
            </>
          )}
        </div>
      </div>

      {/* Right panel — chat */}
      <div className="flex-1 min-w-0 flex flex-col">
        <StocksChat />
      </div>
    </div>
  )
}
