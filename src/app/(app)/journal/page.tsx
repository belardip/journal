export const dynamic = 'force-dynamic'
export const metadata = { title: 'Journal' }

import { db } from '@/lib/db'
import { formatEntryDate } from '@/lib/chat'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TodayBanner } from '@/components/today-banner'
import { EntryCard } from '@/components/journal/EntryCard'

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
          {entries.map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              formattedDate={formatEntryDate(entry.date).replace(/^(.*?),\s/, '')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
