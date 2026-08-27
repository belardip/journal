export const metadata = { title: 'Portfolio' }

import { db } from '@/lib/db'
import { getQuotes, getStockPerformance } from '@/lib/stocks'
import { HoldingsList, type HoldingRow } from './holdings-chart'
import { ManagePortfolioDialog } from './manage-portfolio-dialog'
import { PortfolioDrawer } from './portfolio-drawer'

export default async function StocksPage() {
  const holdings = await db.stockHolding.findMany({ orderBy: { ticker: 'asc' } })

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
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Holdings panel — takes all remaining space */}
      <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Header */}
        <div className="px-4 sm:px-8 pt-8 sm:pt-10 pb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
            {holdings.length > 0 && (
              <p className="text-sm text-muted-foreground mt-1.5">
                {holdings.length} holding{holdings.length !== 1 ? 's' : ''} · updated live
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <ManagePortfolioDialog holdings={rows} />
            <PortfolioDrawer holdings={rows} />
          </div>
        </div>

        {/* Holdings table */}
        <div className="px-4 sm:px-8 pb-12 space-y-4">
          {holdings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-12 text-center">
              No stocks yet — add one above.
            </p>
          ) : (
            <HoldingsList holdings={rows} />
          )}
        </div>
      </div>
    </div>
  )
}
