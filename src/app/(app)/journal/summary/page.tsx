export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
] as const

export default async function JournalSummaryPage() {
  const profile = await db.userProfile.findFirst()

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Summary</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Built from {profile.entriesAnalyzed} {profile.entriesAnalyzed === 1 ? 'entry' : 'entries'}
            {profile.lastUpdatedAt && ` · Updated ${timeAgo(profile.lastUpdatedAt)}`}
          </p>
        </div>
      </div>

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
