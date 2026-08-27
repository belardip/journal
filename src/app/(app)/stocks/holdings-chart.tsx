'use client'

import { Fragment, useState, useTransition } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { removeHoldingAction, updateHoldingAction } from '@/app/actions/stocks'
import { Input } from '@/components/ui/input'
import { InlineStockChart } from './inline-stock-chart'

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

  const expandedPanel = (h: HoldingRow) => (
    <div className="bg-muted/40 border border-border/60 rounded-2xl p-5">
      {editing === h.ticker ? (
        <EditRow holding={h} onDone={() => setEditing(null)} />
      ) : (
        <InlineStockChart
          h={h}
          onEdit={() => setEditing(h.ticker)}
          onRemove={() => remove(h.ticker)}
          removing={removing}
        />
      )}
    </div>
  )

  return (
    <>
      {/* ── Mobile card list (below md) ─────────────────────────── */}
      <div className="md:hidden divide-y divide-border/60">
        {holdings.map(h => (
          <div key={h.ticker}>
            <div
              onClick={() => toggle(h.ticker)}
              className="flex flex-col py-4 cursor-pointer"
            >
              {/* Main row: name + price + chevron */}
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 overflow-hidden">
                    <span className="font-mono font-semibold text-sm shrink-0">{h.ticker}</span>
                    <span className="text-[13px] text-muted-foreground truncate">{h.name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {h.shares} shares · avg {money(h.avgPrice)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-medium tabular-nums">{money(h.price)}</div>
                  <div className="flex items-center justify-end gap-1 mt-0.5 text-xs">
                    <span className="text-muted-foreground/60">Overall</span>
                    <ColorPct n={h.gainLossPercent} />
                  </div>
                </div>
                <div className="text-muted-foreground shrink-0">
                  {expanded === h.ticker
                    ? <ChevronUp className="h-3.5 w-3.5 opacity-40" />
                    : <ChevronDown className="h-3.5 w-3.5 opacity-40" />}
                </div>
              </div>

              {/* Full-width perf row */}
              <div className="flex items-center justify-between mt-2 text-[13px]">
                {([['1W', h.w1], ['1M', h.m1], ['6M', h.m6], ['1Y', h.y1]] as [string, number][]).map(([label, val]) => (
                  <span key={label} className="flex items-center gap-1">
                    <span className="text-muted-foreground/60">{label}</span>
                    <ColorPct n={val} />
                  </span>
                ))}
              </div>
            </div>

            {expanded === h.ticker && (
              <div className="pb-5 pt-1" onClick={e => e.stopPropagation()}>
                {/* Performance row */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {([['1W', h.w1], ['1M', h.m1], ['6M', h.m6], ['1Y', h.y1]] as [string, number][]).map(([label, val]) => (
                    <div key={label} className="bg-muted/40 rounded-lg py-2 text-center">
                      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                      <ColorPct n={val} />
                    </div>
                  ))}
                </div>
                {expandedPanel(h)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Desktop table (md and up) ───────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
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
                      {expandedPanel(h)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
