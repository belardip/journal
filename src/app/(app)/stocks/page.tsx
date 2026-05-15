import { db } from '@/lib/db'
import { getQuotes, getStockPerformance } from '@/lib/stocks'
import { HoldingsList, type HoldingRow } from './holdings-chart'
import { AddHoldingForm } from './add-holding-form'
import { AiNewsButton } from './ai-news-button'

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
          <AiNewsButton holdings={rows} />
          <HoldingsList holdings={rows} />
        </>
      )}
    </div>
  )
}
