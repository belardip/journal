export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatEntryDate } from '@/lib/chat'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TodayBanner } from '@/components/today-banner'

const timeIcons: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
}

const timeOrder: Record<string, number> = {
  morning: 1,
  afternoon: 2,
  evening: 3,
  night: 4,
}

export default async function JournalPage() {
  const entries = await db.journalEntry.findMany({
    orderBy: { date: 'desc' },
  })

  // Sort entries on the same date by time of day
  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date > b.date ? -1 : 1
    return (timeOrder[a.timeOfDay ?? ''] ?? 5) - (timeOrder[b.timeOfDay ?? ''] ?? 5)
  })

  return (
    <div>
      {entries.length > 0 && (
        <TodayBanner entryDates={entries.map(e => e.date)} />
      )}

      {entries.length === 0 ? (
        <div className="text-center py-32">
          <p className="text-4xl mb-4">📖</p>
          <h2 className="text-xl font-semibold mb-2">Start your journal</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Write your first entry and begin a conversation about your day.
          </p>
          <Button asChild>
            <Link href="/journal/new">Write your first entry</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => {
            const themes = (() => {
              try { return JSON.parse(entry.themes) as string[] } catch { return [] }
            })()

            return (
              <Link key={entry.id} href={`/journal/${entry.id}`} className="block group">
                <Card className="group-hover:shadow-md group-hover:border-foreground/20 transition-all duration-200">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold">
                            {formatEntryDate(entry.date).replace(/^(.*?),\s/, '')}
                          </h3>
                          {entry.timeOfDay && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              {timeIcons[entry.timeOfDay]} {entry.timeOfDay.charAt(0).toUpperCase() + entry.timeOfDay.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {entry.summary ?? entry.content.slice(0, 140)}
                        </p>
                        {themes.length > 0 && (
                          <div className="flex gap-1.5 mt-3 flex-wrap">
                            {themes.slice(0, 4).map((theme, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {theme}
                              </Badge>
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
          })}
        </div>
      )}
    </div>
  )
}
