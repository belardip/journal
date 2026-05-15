'use client'

import { useState } from 'react'

type Entry = { id: number; date: string; mood: string | null; moodScore: number | null; summary: string | null }

function scoreToColor(score: number | null | undefined): string {
  if (!score) return 'bg-muted'
  if (score <= 2) return 'bg-red-600'
  if (score <= 3) return 'bg-red-400'
  if (score <= 4) return 'bg-orange-400'
  if (score <= 5) return 'bg-amber-400'
  if (score <= 6) return 'bg-yellow-300'
  if (score <= 7) return 'bg-lime-400'
  if (score <= 8) return 'bg-green-400'
  if (score <= 9) return 'bg-green-500'
  return 'bg-green-600'
}

export function MoodHeatmap({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<Entry | null>(null)

  const byDate = new Map(entries.map(e => [e.date, e]))

  const months: { year: number; month: number; label: string }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString('en-US', { month: 'short' }),
    })
  }

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5 min-w-0">
          <div className="flex flex-col gap-1 shrink-0">
            <div className="h-5" />
            {Array.from({ length: 31 }, (_, i) => (
              <div key={i} className="h-3.5 w-4 text-right text-[9px] text-muted-foreground leading-[14px]">
                {(i + 1) % 5 === 1 ? i + 1 : ''}
              </div>
            ))}
          </div>

          {months.map(({ year, month, label }) => {
            const daysInMonth = new Date(year, month, 0).getDate()
            return (
              <div key={`${year}-${month}`} className="flex flex-col gap-1 shrink-0">
                <div className="text-[9px] text-muted-foreground text-center h-5 leading-5">{label}</div>
                {Array.from({ length: 31 }, (_, i) => {
                  const day = i + 1
                  if (day > daysInMonth) {
                    return <div key={i} className="h-3.5 w-3.5 rounded-sm opacity-0" />
                  }
                  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const entry = byDate.get(dateStr)
                  return (
                    <div
                      key={i}
                      onClick={() => entry ? setSelected(s => s?.id === entry.id ? null : entry) : undefined}
                      className={[
                        'h-3.5 w-3.5 rounded-sm transition-all',
                        scoreToColor(entry?.moodScore),
                        entry ? 'cursor-pointer hover:ring-1 hover:ring-foreground/40 hover:scale-110' : '',
                        selected?.id === entry?.id ? 'ring-1 ring-foreground/60' : '',
                      ].join(' ')}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
        <span>Low</span>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(s => (
          <div key={s} className={`h-3 w-3 rounded-sm ${scoreToColor(s)}`} />
        ))}
        <span>High</span>
      </div>

      {selected && (
        <div className="mt-4 p-3 rounded-lg bg-muted text-sm animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium">
              {new Date(selected.date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'short', month: 'long', day: 'numeric',
              })}
            </span>
            <span className="text-muted-foreground capitalize">
              {selected.mood ?? ''}{selected.moodScore ? ` · ${selected.moodScore}/10` : ''}
            </span>
          </div>
          {selected.summary && (
            <p className="text-xs text-muted-foreground leading-relaxed">{selected.summary}</p>
          )}
        </div>
      )}
    </div>
  )
}
