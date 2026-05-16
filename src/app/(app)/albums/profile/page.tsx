export const dynamic = 'force-dynamic'
export const metadata = { title: 'Taste Profile' }

import { db } from '@/lib/db'
import { parseJson } from '@/lib/albums'
import { AddContextForm } from './AddContextForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { User2 } from 'lucide-react'

export default async function ProfilePage() {
  const profile = await db.tasteProfile.findFirst()

  if (!profile) {
    return (
      <div className="text-center py-24 text-muted-foreground max-w-sm mx-auto">
        <User2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-foreground mb-1">No taste profile yet</p>
        <p className="text-sm mb-4">Rate a few albums and your profile will be generated automatically.</p>
        <Button asChild><Link href="/albums">Go to albums</Link></Button>
      </div>
    )
  }

  const genres = parseJson<string[]>(profile.favoriteGenres, [])
  const artists = parseJson<string[]>(profile.favoriteArtists, [])
  const decades = parseJson<string[]>(profile.preferredDecades, [])
  const moods = parseJson<string[]>(profile.moodPreferences, [])
  const dislikes = parseJson<string[]>(profile.dislikedPatterns, [])

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Taste profile</h1>
          {profile.albumsAnalyzed > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">Based on {profile.albumsAnalyzed} album{profile.albumsAnalyzed !== 1 ? 's' : ''}</p>
          )}
        </div>
        {profile.isUpdating && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
      </div>

      {profile.summary && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {profile.summary.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {genres.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Genres</h3>
            <div className="flex flex-wrap gap-1.5">
              {genres.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
            </div>
          </div>
        )}
        {decades.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Eras</h3>
            <div className="flex flex-wrap gap-1.5">
              {decades.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
            </div>
          </div>
        )}
        {artists.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Artists</h3>
            <div className="flex flex-wrap gap-1.5">
              {artists.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
            </div>
          </div>
        )}
        {moods.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Moods</h3>
            <div className="flex flex-wrap gap-1.5">
              {moods.map(m => <Badge key={m} variant="outline">{m}</Badge>)}
            </div>
          </div>
        )}
      </div>

      {dislikes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Disliked patterns</h3>
          <div className="flex flex-wrap gap-1.5">
            {dislikes.map(d => <Badge key={d} variant="destructive" className="opacity-70">{d}</Badge>)}
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium mb-2">Add context</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tell your curator something about your taste that isn't captured above.
        </p>
        <AddContextForm />
      </div>
    </div>
  )
}
