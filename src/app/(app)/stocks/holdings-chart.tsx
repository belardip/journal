'use client'

import { Fragment, useState, useTransition } from 'react'
import { Trash2, Pencil, Check, X, ChevronDown, ChevronUp, LineChart } from 'lucide-react'
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-170 border-collapse">
        <colgroup>
          <col style={{ width: '26%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '9%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '24px' }} />
        </colgroup>
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="font-medium text-left pb-3">Stock</th>
            <th className="font-medium text-right pb-3">Price</th>
            <th className="font-medium text-right pb-3">1W</th>
            <th className="font-medium text-right pb-3">1M</th>
            <th className="font-medium text-right pb-3">6M</th>
            <th className="font-medium text-right pb-3">1Y</th>
            <th className="font-medium text-right pb-3">Gain</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => (
            <Fragment key={h.ticker}>
              <tr
                onClick={() => toggle(h.ticker)}
                className="border-t border-border/60 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <td className="py-4.5 pr-3 overflow-hidden">
                  <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="font-mono font-semibold text-sm">{h.ticker}</span>
                    <span className="text-[13px] text-muted-foreground truncate">{h.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {h.shares} shares · avg {money(h.avgPrice)}
                  </div>
                </td>
                <td className="text-right py-4.5 text-sm font-medium tabular-nums">{money(h.price)}</td>
                <td className="text-right py-4.5 text-xs"><ColorPct n={h.w1} /></td>
                <td className="text-right py-4.5 text-xs"><ColorPct n={h.m1} /></td>
                <td className="text-right py-4.5 text-xs"><ColorPct n={h.m6} /></td>
                <td className="text-right py-4.5 text-xs"><ColorPct n={h.y1} /></td>
                <td className="text-right py-4.5 text-[13px] font-medium"><ColorPct n={h.gainLossPercent} /></td>
                <td className="py-4.5 pl-3 text-muted-foreground">
                  {expanded === h.ticker
                    ? <ChevronUp className="h-3.75 w-3.75 opacity-40" />
                    : <ChevronDown className="h-3.75 w-3.75 opacity-40" />}
                </td>
              </tr>

              {expanded === h.ticker && (
                <tr>
                  <td colSpan={8} className="pb-6 pt-1" onClick={e => e.stopPropagation()}>
                    <div className="bg-muted/40 border border-border/60 rounded-2xl p-5">
                      {editing === h.ticker ? (
                        <EditRow holding={h} onDone={() => setEditing(null)} />
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-baseline gap-3">
                            <span className="text-[22px] font-semibold">{money(h.price)}</span>
                            <span className={`text-sm font-medium ${h.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              <ColorPct n={h.changePercent} /> today
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Shares', value: String(h.shares) },
                              { label: 'Avg paid', value: money(h.avgPrice) },
                              { label: 'Market value', value: money(h.marketValue) },
                              { label: 'Gain/loss', value: money(h.gainLoss), color: h.gainLoss >= 0 ? 'text-green-600' : 'text-red-500' },
                            ].map(({ label, value, color }) => (
                              <div key={label}>
                                <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
                                <p className={`text-[13px] font-medium ${color ?? ''}`}>{value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <Link href={`/stocks/${h.ticker}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
                              <LineChart className="h-3 w-3" /> View chart
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
                    </div>
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
