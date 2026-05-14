'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import { removeHoldingAction, updateHoldingAction } from '@/app/actions/stocks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export type HoldingRow = {
  ticker: string
  name: string
  shares: number
  avgPrice: number
  price: number
  change: number
  changePercent: number
  costBasis: number
  marketValue: number
  gainLoss: number
  gainLossPercent: number
}

function pct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}
function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function EditRow({ holding, onDone }: { holding: HoldingRow; onDone: () => void }) {
  const [shares, setShares] = useState(String(holding.shares))
  const [avgPrice, setAvgPrice] = useState(String(holding.avgPrice))
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      await updateHoldingAction({
        ticker: holding.ticker,
        shares: parseFloat(shares) || 0,
        avgPrice: parseFloat(avgPrice) || 0,
      })
      onDone()
    })
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="w-16 font-mono font-semibold text-sm">{holding.ticker}</span>
      <Input
        type="number"
        value={shares}
        onChange={e => setShares(e.target.value)}
        className="h-7 w-24 text-sm"
        placeholder="Shares"
      />
      <Input
        type="number"
        value={avgPrice}
        onChange={e => setAvgPrice(e.target.value)}
        className="h-7 w-24 text-sm"
        placeholder="Avg price"
      />
      <button onClick={save} disabled={pending} className="text-muted-foreground hover:text-foreground"><Check className="h-4 w-4" /></button>
      <button onClick={onDone} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  )
}

export function HoldingsList({ holdings }: { holdings: HoldingRow[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, startRemoving] = useTransition()

  function remove(ticker: string) {
    startRemoving(async () => {
      await removeHoldingAction(ticker)
    })
  }

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0)
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0)
  const totalGain = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  return (
    <div className="space-y-3">
      {/* Portfolio totals */}
      <div className="grid grid-cols-3 gap-3 p-4 bg-muted rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Portfolio value</p>
          <p className="font-semibold">{money(totalValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total cost</p>
          <p className="font-semibold">{money(totalCost)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total gain/loss</p>
          <p className={`font-semibold ${totalGain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {money(totalGain)} ({pct(totalGainPct)})
          </p>
        </div>
      </div>

      {/* Holdings list */}
      <div className="divide-y">
        {holdings.map(h => (
          <div key={h.ticker}>
            {editing === h.ticker ? (
              <EditRow holding={h} onDone={() => setEditing(null)} />
            ) : (
              <div className="py-3 flex items-start justify-between gap-2">
                <Link href={`/stocks/${h.ticker}`} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-mono font-semibold">{h.ticker}</span>
                    <span className="text-xs text-muted-foreground truncate">{h.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                    <span>{money(h.price)}</span>
                    <span className={h.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {pct(h.changePercent)} today
                    </span>
                    <span className="text-muted-foreground">{h.shares} shares · {money(h.marketValue)}</span>
                    <span className={h.gainLoss >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {money(h.gainLoss)} ({pct(h.gainLossPercent)}) total
                    </span>
                  </div>
                </Link>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(h.ticker)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(h.ticker)}
                    disabled={removing}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
