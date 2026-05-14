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

const RANGE_MAP: Record<RangeKey, { range: string; interval: string }> = {
  '1mo': { range: '1mo', interval: '1d' },
  '3mo': { range: '3mo', interval: '1d' },
  '6mo': { range: '6mo', interval: '1wk' },
  '1y':  { range: '1y',  interval: '1wk' },
  '5y':  { range: '5y',  interval: '1mo' },
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
  const { range: r, interval } = RANGE_MAP[range]
  const result = await yahooFinance.chart(ticker, { range: r, interval } as Parameters<typeof yahooFinance.chart>[1])
  const quotes = result.quotes ?? []
  return quotes
    .filter(q => q.close != null)
    .map(q => ({
      date: new Date(q.date).toLocaleDateString('en-CA'),
      close: Math.round(q.close! * 100) / 100,
    }))
}

export async function validateTicker(ticker: string): Promise<string | null> {
  try {
    const q = await yahooFinance.quote(ticker.toUpperCase())
    return q.symbol ?? null
  } catch {
    return null
  }
}
