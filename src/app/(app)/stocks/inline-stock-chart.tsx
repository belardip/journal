'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts'
import { Sparkles, Pencil, Trash2 } from 'lucide-react'
import { getHistoryAction, getTickerBreakdownAction } from '@/app/actions/stocks'
import type { HoldingRow } from './holdings-chart'
import type { RangeKey } from '@/lib/stocks'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
]

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

interface Props {
  h: HoldingRow
  onEdit: () => void
  onRemove: () => void
  removing: boolean
}

export function InlineStockChart({ h, onEdit, onRemove, removing }: Props) {
  const [range, setRange] = useState<RangeKey>('1mo')
  const [data, setData] = useState<{ date: string; close: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [aiPending, startAi] = useTransition()

  useEffect(() => {
    setLoading(true)
    getHistoryAction(h.ticker, range).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [h.ticker, range])

  const rangeChange = data.length >= 2
    ? ((data[data.length - 1].close - data[0].close) / data[0].close) * 100
    : h.changePercent
  const color = rangeChange >= 0 ? '#16a34a' : '#ef4444'
  const gradId = `grad-${h.ticker}`

  function loadAi() {
    if (aiResult) { setAiResult(null); return }
    startAi(async () => {
      const text = await getTickerBreakdownAction({
        ticker: h.ticker, name: h.name, changePercent: rangeChange, range,
      })
      setAiResult(text)
    })
  }

  return (
    <div className="space-y-4">
      {/* Price + range selector */}
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-3">
          <span className="text-[22px] font-semibold">{money(h.price)}</span>
          <span className={`text-[13px] font-medium ${h.changePercent >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {h.changePercent >= 0 ? '+' : ''}{h.changePercent.toFixed(2)}% today
          </span>
        </div>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                r.key === range
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-36 flex items-center justify-center">
          <span className="inline-flex gap-1 text-muted-foreground">
            <span className="animate-bounce text-base leading-none">·</span>
            <span className="animate-bounce text-base leading-none [animation-delay:0.15s]">·</span>
            <span className="animate-bounce text-base leading-none [animation-delay:0.3s]">·</span>
          </span>
        </div>
      ) : data.length < 2 ? (
        <div className="h-36 flex items-center justify-center text-sm text-muted-foreground">
          No chart data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} tickFormatter={v => `$${v}`} domain={['auto', 'auto']} />
            <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Shares', value: String(h.shares) },
          { label: 'Avg paid', value: money(h.avgPrice) },
          { label: 'Market value', value: money(h.marketValue) },
          { label: 'Gain/loss', value: money(h.gainLoss), color: h.gainLoss >= 0 ? 'text-green-600' : 'text-red-500' },
        ].map(({ label, value, color: c }) => (
          <div key={label}>
            <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
            <p className={`text-[13px] font-medium ${c ?? ''}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* AI breakdown */}
      {aiResult ? (
        <div className="rounded-xl bg-muted/60 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s going on</p>
            <button onClick={() => setAiResult(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Dismiss</button>
          </div>
          <p className="text-sm leading-relaxed">{aiResult}</p>
        </div>
      ) : (
        <button
          onClick={loadAi}
          disabled={aiPending}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {aiPending ? 'Looking up news…' : "What's going on?"}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-3">
        <button onClick={onEdit} className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Pencil className="h-3 w-3" /> Edit
        </button>
        <button onClick={onRemove} disabled={removing} className="flex items-center gap-1 hover:text-destructive transition-colors">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
    </div>
  )
}
