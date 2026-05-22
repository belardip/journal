'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronUp } from 'lucide-react'

const timeIcons: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
}

type Entry = {
  id: number
  date: string
  timeOfDay: string | null
  content: string
  summary: string | null
  themes: string
  mood: string | null
  moodScore: number | null
  sessionComplete: boolean
}

export function EntryCard({ entry, formattedDate }: { entry: Entry; formattedDate: string }) {
  const [expanded, setExpanded] = useState(false)

  const themes = (() => {
    try { return JSON.parse(entry.themes) as string[] } catch { return [] }
  })()

  return (
    <Link href={`/journal/${entry.id}`} className="block group">
      <Card className="group-hover:shadow-md group-hover:border-foreground/20 transition-all duration-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold">{formattedDate}</h3>
                {entry.timeOfDay && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    {timeIcons[entry.timeOfDay]} {entry.timeOfDay.charAt(0).toUpperCase() + entry.timeOfDay.slice(1)}
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {entry.summary ?? entry.content.slice(0, 140)}
              </p>

              {entry.summary && (
                <button
                  type="button"
                  onClick={e => { e.preventDefault(); setExpanded(v => !v) }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
                >
                  {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {expanded ? 'Hide' : 'Show entry'}
                </button>
              )}

              {expanded && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-3 whitespace-pre-wrap border-t pt-3">
                  {entry.content}
                </p>
              )}

              {themes.length > 0 && (
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {themes.slice(0, 4).map((theme, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{theme}</Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              {entry.mood && (
                <Badge variant="outline" className="whitespace-nowrap">
                  {entry.mood}{entry.moodScore ? ` · ${entry.moodScore}/10` : ''}
                </Badge>
              )}
              <span className={`text-xs font-medium ${entry.sessionComplete ? 'text-green-600' : 'text-amber-500'}`}>
                {entry.sessionComplete ? '✓ Complete' : 'In progress'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
