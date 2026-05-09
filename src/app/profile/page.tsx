export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  { key: 'recurringThemes', label: 'Recurring Themes', icon: '🔁' },
  { key: 'behavioralPatterns', label: 'Behavioral Patterns', icon: '🧠' },
  { key: 'moodTrends', label: 'Mood Trends', icon: '📈' },
  { key: 'goalsMentioned', label: 'Goals', icon: '🎯' },
  { key: 'peopleMentioned', label: 'People in Your Life', icon: '👥' },
] as const

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

export default async function ProfilePage() {
  const profile = await db.userProfile.findFirst()

  if (!profile?.summary) {
    return (
      <div className="text-center py-32">
        <p className="text-4xl mb-4">🌱</p>
        <h2 className="text-xl font-semibold mb-2">Your profile is growing</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
          Complete a few journal sessions and your AI companion will start building a picture of who you are.
        </p>
        <Button asChild>
          <Link href="/journal/new">Start journaling</Link>
        </Button>
      </div>
    )
  }

  const recurringThemes = parseList(profile.recurringThemes)
  const peopleMentioned = parseList(profile.peopleMentioned)

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">My Profile</h1>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-4 text-center">
          <div className="text-xs text-muted-foreground">Entries Analyzed</div>
          <div className="text-2xl font-semibold mt-1">{profile.entriesAnalyzed}</div>
        </Card>
        {recurringThemes.length > 0 && (
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">Themes Identified</div>
            <div className="text-2xl font-semibold mt-1">{recurringThemes.length}</div>
          </Card>
        )}
        {peopleMentioned.length > 0 && (
          <Card className="p-4 text-center">
            <div className="text-xs text-muted-foreground">People Mentioned</div>
            <div className="text-2xl font-semibold mt-1">{peopleMentioned.length}</div>
          </Card>
        )}
      </div>

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
