export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  return { title: ticker.toUpperCase() }
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { getQuote, getHistory, type RangeKey } from '@/lib/stocks'
import { StockChart } from './stock-chart'
import { AiBreakdownButton } from './ai-breakdown-button'

const VALID_RANGES: RangeKey[] = ['1mo', '3mo', '6mo', '1y', '5y']

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

export default async function StockPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>
  searchParams: Promise<{ range?: string }>
}) {
  const { ticker } = await params
  const { range: rawRange } = await searchParams
  const range: RangeKey = VALID_RANGES.includes(rawRange as RangeKey) ? (rawRange as RangeKey) : '1mo'

  const holding = await db.stockHolding.findUnique({ where: { ticker } })
  if (!holding) notFound()

  const [quote, history] = await Promise.all([
    getQuote(ticker),
    getHistory(ticker, range),
  ])

  const marketValue = quote.price * holding.shares
  const costBasis = holding.avgPrice * holding.shares
  const gainLoss = marketValue - costBasis
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0
  const positive = quote.changePercent >= 0

  // Change over the selected range using history
  const rangeChange = history.length >= 2
    ? ((history[history.length - 1].close - history[0].close) / history[0].close) * 100
    : quote.changePercent

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/stocks" className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold leading-tight">{ticker}</h1>
          <p className="text-xs text-muted-foreground">{quote.name}</p>
        </div>
      </div>

      {/* Price header */}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold">{money(quote.price)}</span>
        <span className={`text-sm font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {pct(quote.changePercent)} today
        </span>
      </div>

      {/* Chart */}
      <StockChart data={history} range={range} ticker={ticker} positive={rangeChange >= 0} />

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Shares', value: holding.shares },
          { label: 'Avg price paid', value: money(holding.avgPrice) },
          { label: 'Market value', value: money(marketValue) },
          {
            label: 'Your gain/loss',
            value: `${money(gainLoss)} (${pct(gainLossPercent)})`,
            color: gainLoss >= 0 ? 'text-green-600' : 'text-red-500',
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-muted rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`font-semibold text-sm mt-0.5 ${color ?? ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* AI breakdown */}
      <AiBreakdownButton ticker={ticker} name={quote.name} changePercent={rangeChange} range={range} />
    </div>
  )
}
