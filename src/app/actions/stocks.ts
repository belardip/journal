'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { validateTicker, getWeeklyChangePct } from '@/lib/stocks'
import { anthropic } from '@/lib/ai'

export async function addHoldingAction(data: {
  ticker: string
  shares: number
  avgPrice: number
}): Promise<{ error?: string }> {
  const ticker = data.ticker.trim().toUpperCase()
  if (!ticker) return { error: 'Enter a ticker symbol' }

  const valid = await validateTicker(ticker)
  if (!valid) return { error: `"${ticker}" wasn't found on Yahoo Finance — check the ticker symbol` }

  const existing = await db.stockHolding.findUnique({ where: { ticker: valid } })
  if (existing) return { error: `${valid} is already in your portfolio` }

  await db.stockHolding.create({
    data: { ticker: valid, shares: data.shares, avgPrice: data.avgPrice },
  })

  revalidatePath('/stocks')
  return {}
}

export async function updateHoldingAction(data: {
  ticker: string
  shares: number
  avgPrice: number
}): Promise<{ error?: string }> {
  await db.stockHolding.update({
    where: { ticker: data.ticker },
    data: { shares: data.shares, avgPrice: data.avgPrice },
  })
  revalidatePath('/stocks')
  revalidatePath(`/stocks/${data.ticker}`)
  return {}
}

export async function removeHoldingAction(ticker: string): Promise<void> {
  await db.stockHolding.delete({ where: { ticker } })
  revalidatePath('/stocks')
}

export async function getTickerBreakdownAction({
  ticker, name, changePercent, range,
}: {
  ticker: string
  name: string
  changePercent: number
  range: string
}): Promise<string> {
  const rangeLabel: Record<string, string> = {
    '1mo': '1 month', '3mo': '3 months', '6mo': '6 months', '1y': '1 year', '5y': '5 years',
  }
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    tools: [{ type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `The stock ${ticker} (${name}) is ${changePercent >= 0 ? 'up' : 'down'} ${Math.abs(changePercent).toFixed(1)}% over the last ${rangeLabel[range] ?? range}.

Search for recent news and write me a plain-English breakdown (4-6 sentences):
1. What's been driving the price movement recently
2. What this company actually does (one sentence, simple)
3. One key number that matters right now and what it means in plain English — avoid jargon, or explain any term you use in plain language

Be direct and specific. Don't be vague or cheerful.`,
    }],
  })
  return msg.content.find(b => b.type === 'text')?.text ?? ''
}

export async function getPortfolioNewsAction(
  holdings: { ticker: string; name: string; price: number }[]
): Promise<string> {
  const weeklyChanges = await Promise.all(holdings.map(h => getWeeklyChangePct(h.ticker)))

  const movers = holdings
    .map((h, i) => ({ ...h, weeklyChange: weeklyChanges[i] }))
    .filter(h => Math.abs(h.weeklyChange) >= 3)

  if (movers.length === 0) {
    return "Nothing in your portfolio moved more than 3% this week."
  }

  const lines = movers.map(h =>
    `${h.ticker} (${h.name}): $${h.price.toFixed(2)}, ${h.weeklyChange >= 0 ? '+' : ''}${h.weeklyChange.toFixed(1)}% this week`
  ).join('\n')

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    tools: [{ type: 'web_search_20250305' as 'web_search_20250305', name: 'web_search' }],
    messages: [{
      role: 'user',
      content: `These stocks in my portfolio moved significantly this week:\n${lines}\n\nSearch for recent news and write a short plain-English summary (3-5 sentences) on what drove the moves. Be direct and specific. No jargon without explanation.`,
    }],
  })

  return msg.content.find(b => b.type === 'text')?.text ?? ''
}
