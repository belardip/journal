'use client'

import { Fragment, useState, useTransition } from 'react'
import { Trash2, Pencil, Check, X } from 'lucide-react'
import Link from 'next/link'
import { removeHoldingAction, updateHoldingAction } from '@/app/actions/stocks'
import { Input } from '@/components/ui/input'

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
  w1: number
  m1: number
  m6: number
  y1: number
}

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function ColorPct({ n }: { n: number }) {
  const color = n > 0 ? 'text-green-600' : n < 0 ? 'text-red-500' : 'text-muted-foreground'
  return <span className={`${color} tabular-nums`}>{n >= 0 ? '+' : ''}{n.toFixed(1)}%</span>
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
    <div className="flex items-center gap-2 py-2 flex-wrap">
      <Input type="number" value={shares} onChange={e => setShares(e.target.value)}
        className="h-7 w-24 text-sm" placeholder="Shares" />
      <Input type="number" value={avgPrice} onChange={e => setAvgPrice(e.target.value)}
        className="h-7 w-28 text-sm" placeholder="Avg price" />
      <button onClick={save} disabled={pending} className="text-muted-foreground hover:text-foreground">
        <Check className="h-4 w-4" />
      </button>
      <button onClick={onDone} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export function HoldingsList({ holdings }: { holdings: HoldingRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [removing, startRemoving] = useTransition()

  function toggle(ticker: string) {
    setExpanded(e => e === ticker ? null : ticker)
    setEditing(null)
  }

  function remove(ticker: string) {
    startRemoving(async () => { await removeHoldingAction(ticker) })
  }

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0)
  const totalCost = holdings.reduce((s, h) => s + h.costBasis, 0)
  const totalGain = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  return (
    <div className="space-y-3">
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
          <p className="font-semibold"><ColorPct n={totalGainPct} /></p>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="font-normal text-left pb-2">Stock</th>
            <th className="font-normal text-right pb-2">1W</th>
            <th className="font-normal text-right pb-2">1M</th>
            <th className="font-normal text-right pb-2">6M</th>
            <th className="font-normal text-right pb-2">1Y</th>
            <th className="font-normal text-right pb-2">Gain</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => (
            <Fragment key={h.ticker}>
              <tr
                onClick={() => toggle(h.ticker)}
                className="border-b cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <td className="py-3 pr-2">
                  <div className="font-mono font-semibold text-sm">{h.ticker}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-24">{h.name}</div>
                </td>
                <td className="text-right py-3 text-xs"><ColorPct n={h.w1} /></td>
                <td className="text-right py-3 text-xs"><ColorPct n={h.m1} /></td>
                <td className="text-right py-3 text-xs"><ColorPct n={h.m6} /></td>
                <td className="text-right py-3 text-xs"><ColorPct n={h.y1} /></td>
                <td className="text-right py-3 text-xs"><ColorPct n={h.gainLossPercent} /></td>
              </tr>
              {expanded === h.ticker && (
                <tr>
                  <td colSpan={6} className="pb-4 pt-2">
                    {editing === h.ticker ? (
                      <EditRow holding={h} onDone={() => setEditing(null)} />
                    ) : (
                      <div className="space-y-3 pl-1">
                        <div className="flex items-baseline gap-3">
                          <span className="text-xl font-bold">{money(h.price)}</span>
                          <span className={`text-sm ${h.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            <ColorPct n={h.changePercent} /> today
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                          {[
                            { label: 'Shares', value: String(h.shares) },
                            { label: 'Avg paid', value: money(h.avgPrice) },
                            { label: 'Market value', value: money(h.marketValue) },
                            { label: 'Gain/loss', value: money(h.gainLoss), color: h.gainLoss >= 0 ? 'text-green-600' : 'text-red-500' },
                          ].map(({ label, value, color }) => (
                            <div key={label}>
                              <p className="text-xs text-muted-foreground">{label}</p>
                              <p className={`font-medium ${color ?? ''}`}>{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <Link href={`/stocks/${h.ticker}`} className="hover:text-foreground transition-colors">
                            View chart →
                          </Link>
                          <button onClick={() => setEditing(h.ticker)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button onClick={() => remove(h.ticker)} disabled={removing} className="flex items-center gap-1 hover:text-destructive transition-colors">
                            <Trash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
