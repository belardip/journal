'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import type { HistoricalPoint, RangeKey } from '@/lib/stocks'

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '1mo', label: '1M' },
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '5y', label: '5Y' },
]

interface Props {
  data: HistoricalPoint[]
  range: RangeKey
  ticker: string
  positive: boolean
}

export function StockChart({ data, range, ticker, positive }: Props) {
  const router = useRouter()

  function setRange(r: RangeKey) {
    router.push(`/stocks/${ticker}?range=${r}`)
  }

  const color = positive ? '#16a34a' : '#ef4444'

  return (
    <div>
      <div className="flex gap-1 mb-3">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              range === r.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={55}
            tickFormatter={v => `$${v}`}
            domain={['auto', 'auto']}
          />
          <Tooltip
            formatter={(v: number) => [`$${v.toFixed(2)}`, 'Price']}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ fontSize: 12 }}
          />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#grad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
