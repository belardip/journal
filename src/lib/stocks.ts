import YahooFinance from 'yahoo-finance2'
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export type QuoteResult = {
  ticker: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
}

export type HistoricalPoint = {
  date: string
  close: number
}

export type RangeKey = '1mo' | '3mo' | '6mo' | '1y' | '5y'

const RANGE_TO_INTERVAL: Record<RangeKey, string> = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1wk',
  '1y':  '1wk',
  '5y':  '1mo',
}

function rangeToPeriod1(range: RangeKey): Date {
  const d = new Date()
  if (range === '1mo') d.setMonth(d.getMonth() - 1)
  else if (range === '3mo') d.setMonth(d.getMonth() - 3)
  else if (range === '6mo') d.setMonth(d.getMonth() - 6)
  else if (range === '1y') d.setFullYear(d.getFullYear() - 1)
  else if (range === '5y') d.setFullYear(d.getFullYear() - 5)
  return d
}

export async function getQuote(ticker: string): Promise<QuoteResult> {
  const q = await yahooFinance.quote(ticker)
  return {
    ticker: q.symbol,
    name: q.shortName ?? q.longName ?? ticker,
    price: q.regularMarketPrice ?? 0,
    change: q.regularMarketChange ?? 0,
    changePercent: q.regularMarketChangePercent ?? 0,
    currency: q.currency ?? 'USD',
  }
}

export async function getQuotes(tickers: string[]): Promise<QuoteResult[]> {
  return Promise.all(tickers.map(getQuote))
}

export async function getHistory(ticker: string, range: RangeKey): Promise<HistoricalPoint[]> {
  try {
    const period1 = rangeToPeriod1(range)
    const interval = RANGE_TO_INTERVAL[range]
    const result = await yahooFinance.chart(ticker, { period1, interval } as Parameters<typeof yahooFinance.chart>[1])
    const quotes = result.quotes ?? []
    return quotes
      .filter(q => q.close != null)
      .map(q => ({
        date: new Date(q.date).toLocaleDateString('en-CA'),
        close: Math.round(q.close! * 100) / 100,
      }))
  } catch {
    return []
  }
}

export async function validateTicker(ticker: string): Promise<string | null> {
  try {
    const q = await yahooFinance.quote(ticker.toUpperCase())
    return q.symbol ?? null
  } catch {
    return null
  }
}

export type PerformanceData = { w1: number; m1: number; m6: number; y1: number }

export async function getStockPerformance(ticker: string): Promise<PerformanceData> {
  try {
    const period1 = new Date()
    period1.setFullYear(period1.getFullYear() - 1)
    const result = await yahooFinance.chart(ticker, { period1, interval: '1d' } as Parameters<typeof yahooFinance.chart>[1])
    const closes = (result.quotes ?? []).filter(q => q.close != null).map(q => q.close!)
    if (closes.length < 5) return { w1: 0, m1: 0, m6: 0, y1: 0 }
    const last = closes[closes.length - 1]
    const pct = (from: number) => from > 0 ? ((last - from) / from) * 100 : 0
    const at = (n: number) => closes[Math.max(0, closes.length - 1 - n)]
    return {
      w1: pct(at(5)),
      m1: pct(at(22)),
      m6: pct(at(130)),
      y1: pct(closes[0]),
    }
  } catch {
    return { w1: 0, m1: 0, m6: 0, y1: 0 }
  }
}

export async function getWeeklyChangePct(ticker: string): Promise<number> {
  try {
    const period1 = new Date()
    period1.setDate(period1.getDate() - 8)
    const result = await yahooFinance.chart(ticker, { period1, interval: '1d' } as Parameters<typeof yahooFinance.chart>[1])
    const quotes = (result.quotes ?? []).filter(q => q.close != null)
    if (quotes.length < 2) return 0
    const first = quotes[0].close!
    const last = quotes[quotes.length - 1].close!
    return ((last - first) / first) * 100
  } catch {
    return 0
  }
}
