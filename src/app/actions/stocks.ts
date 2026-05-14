'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { validateTicker } from '@/lib/stocks'

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
