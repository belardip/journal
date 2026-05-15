'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type MonthData = { label: string; avg: number; count: number }

function scoreColor(avg: number): string {
  if (avg <= 3) return '#ef4444'
  if (avg <= 5) return '#f59e0b'
  if (avg <= 7) return '#84cc16'
  return '#22c55e'
}

export function MoodChart({ data }: { data: MonthData[] }) {
  if (data.length === 0) return null
  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const d = payload[0].payload as MonthData
            return (
              <div className="rounded-md border bg-popover px-2 py-1.5 text-xs shadow-md">
                <p className="font-medium">{d.label}</p>
                <p className="text-muted-foreground">Avg {d.avg.toFixed(1)}/10 · {d.count} {d.count === 1 ? 'entry' : 'entries'}</p>
              </div>
            )
          }}
        />
        <Bar dataKey="avg" radius={[3, 3, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={scoreColor(d.avg)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
