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

  const hasSummary = !!entry.summary

  return (
    <Link href={`/journal/${entry.id}`} className="block group">
      <Card className="group-hover:shadow-md group-hover:border-foreground/20 transition-all duration-200">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{formattedDate}</h3>
              {entry.timeOfDay && (
                <Badge variant="secondary" className="text-xs gap-1">
                  {timeIcons[entry.timeOfDay]} {entry.timeOfDay.charAt(0).toUpperCase() + entry.timeOfDay.slice(1)}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {entry.mood && (
                <Badge variant="outline" className="whitespace-nowrap">
                  {entry.mood}{entry.moodScore ? ` · ${entry.moodScore}/10` : ''}
                </Badge>
              )}
              <span className={`text-xs font-medium ${entry.sessionComplete ? 'text-green-600' : 'text-amber-500'}`}>
                {entry.sessionComplete ? '✓' : '…'}
              </span>
            </div>
          </div>

          {/* Summary — full width, expandable */}
          <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
            {entry.summary ?? entry.content.slice(0, 140)}
          </p>

          {hasSummary && (
            <button
              type="button"
              onClick={e => { e.preventDefault(); setExpanded(v => !v) }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? 'Less' : 'More'}
            </button>
          )}

          {themes.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {themes.slice(0, 4).map((theme, i) => (
                <Badge key={i} variant="outline" className="text-xs">{theme}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
