export const metadata = { title: 'Portfolio' }

import { db } from '@/lib/db'
import { getQuotes, getStockPerformance } from '@/lib/stocks'
import { HoldingsList, type HoldingRow } from './holdings-chart'
import { AddHoldingForm } from './add-holding-form'
import { AiNewsButton } from './ai-news-button'
import { StocksChat } from './stocks-chat'

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

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

  const totalValue = rows.reduce((s, r) => s + r.marketValue, 0)
  const totalCost = rows.reduce((s, r) => s + r.costBasis, 0)
  const totalGain = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

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
            <AddHoldingForm />
          </div>
        </div>

        {/* Stats bar */}
        {rows.length > 0 && (
          <div className="px-4 sm:px-8 pb-6 flex items-center gap-7 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Portfolio value</p>
              <p className="text-[19px] font-semibold tracking-tight">{money(totalValue)}</p>
            </div>
            <div className="w-px h-7 bg-border shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total cost</p>
              <p className="text-[19px] font-semibold tracking-tight">{money(totalCost)}</p>
            </div>
            <div className="w-px h-7 bg-border shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total gain/loss</p>
              <p className={`text-[19px] font-semibold tracking-tight ${totalGainPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {totalGainPct >= 0 ? '+' : ''}{totalGainPct.toFixed(1)}%
              </p>
            </div>
          </div>
        )}

        {/* What's moving + Holdings table */}
        <div className="px-4 sm:px-8 pb-12 space-y-4">
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

      {/* Chat rail — self-sizing, collapsible */}
      <StocksChat />
    </div>
  )
}
