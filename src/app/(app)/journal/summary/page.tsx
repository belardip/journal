export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UpdatePoller } from './update-poller'

function parseList(json: string): string[] {
  try { return JSON.parse(json) as string[] } catch { return [] }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const sections = [
  { key: 'moodTrends', label: 'Mood', icon: '📈' },
  { key: 'recurringThemes', label: 'Trends', icon: '🔁' },
  { key: 'peopleMentioned', label: 'Relationships', icon: '👥' },
  { key: 'goalsMentioned', label: 'Goals', icon: '🎯' },
  { key: 'behavioralPatterns', label: 'Patterns', icon: '🧠' },
  { key: 'advice', label: 'Things to Try', icon: '💡' },
] as const

async function EntryObservations() {
  const entry = await db.journalEntry.findFirst({
    where: { sessionComplete: true, observations: { not: null } },
    orderBy: { createdAt: 'desc' },
  })
  if (!entry?.observations) return null

  const dateLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🔍 Latest Entry · {dateLabel}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{entry.observations}</p>
      </CardContent>
    </Card>
  )
}

export default async function JournalSummaryPage() {
  const [profile, updatingSince] = await Promise.all([
    db.userProfile.findFirst(),
    db.appSettings.findUnique({ where: { key: 'profile_updating_since' } }),
  ])

  const isUpdating = updatingSince
    ? (Date.now() - new Date(updatingSince.value).getTime()) < 10 * 60 * 1000
    : false

  if (!profile?.summary) {
    return (
      <div className="text-center py-32">
        <p className="text-4xl mb-4">🌱</p>
        <h2 className="text-xl font-semibold mb-2">Summary not ready yet</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
          Complete a few journal sessions and your AI companion will build a summary here.
        </p>
        <Button asChild>
          <Link href="/journal/new">Write an entry</Link>
        </Button>
      </div>
    )
  }

  return (
    <div>
      {isUpdating && <UpdatePoller />}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Built from {profile.entriesAnalyzed} {profile.entriesAnalyzed === 1 ? 'entry' : 'entries'}
            {profile.lastUpdatedAt && ` · Updated ${timeAgo(profile.lastUpdatedAt)}`}
          </p>
        </div>
      </div>

      {isUpdating && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 px-3 py-2.5 rounded-lg bg-muted">
          <svg className="h-3.5 w-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing your latest entry — this takes a few minutes. Page will update automatically.
        </div>
      )}

      <EntryObservations />

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">✨ Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.summary}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {sections.map(({ key, label, icon }) => {
          const items = parseList(profile[key])
          if (!items.length) return null
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">{icon} {label}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 size-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
