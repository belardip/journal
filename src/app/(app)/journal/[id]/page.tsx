export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { formatEntryDate } from '@/lib/chat'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entry = await db.journalEntry.findUnique({ where: { id: parseInt(id) }, select: { date: true } })
  return { title: entry ? formatEntryDate(entry.date) : 'Entry' }
}
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ChatInterface } from '@/components/journal/ChatInterface'

const timeIcons: Record<string, string> = {
  morning: '🌅',
  afternoon: '☀️',
  evening: '🌆',
  night: '🌙',
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const entry = await db.journalEntry.findUnique({
    where: { id: parseInt(id) },
    include: { messages: { orderBy: { order: 'asc' } } },
  })

  if (!entry) notFound()

  const entryWhen = formatEntryDate(entry.date)
  const messages = entry.messages.map(m => ({ role: m.role, content: m.content }))

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </h2>
              {entry.timeOfDay && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {timeIcons[entry.timeOfDay]} {entry.timeOfDay.charAt(0).toUpperCase() + entry.timeOfDay.slice(1)}
                </p>
              )}
            </div>
            {entry.mood && (
              <Badge variant="outline">
                {entry.mood}{entry.moodScore ? ` · ${entry.moodScore}/10` : ''}
              </Badge>
            )}
          </div>
          <Separator className="mb-4" />
          <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-sm">
            {entry.content}
          </p>
        </CardContent>
      </Card>

      <ChatInterface
        entry={{
          id: entry.id,
          date: entry.date,
          timeOfDay: entry.timeOfDay,
          content: entry.content,
          sessionComplete: entry.sessionComplete,
        }}
        messages={messages}
        entryWhen={entryWhen}
      />
    </div>
  )
}
