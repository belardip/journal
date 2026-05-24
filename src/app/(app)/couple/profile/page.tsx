export const dynamic = 'force-dynamic'
export const metadata = { title: 'Couple Taste Profile' }

import { db } from '@/lib/db'
import { parseJson } from '@/lib/albums'
import { AddCoupleContextForm } from './AddCoupleContextForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Heart } from 'lucide-react'

export default async function CoupleProfilePage() {
  const profile = await db.coupleTasteProfile.findFirst()

  if (!profile?.coupleSummary) {
    return (
      <div className="text-center py-24 text-muted-foreground max-w-sm mx-auto">
        <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-foreground mb-1">No profile yet</p>
        <p className="text-sm mb-4">Rate a few movies together and your joint profile will be generated automatically.</p>
        <Button asChild><Link href="/couple">Go to movies</Link></Button>
      </div>
    )
  }

  const sharedGenres = parseJson<string[]>(profile.sharedGenres, [])
  const sharedDirectors = parseJson<string[]>(profile.sharedDirectors, [])
  const sharedDecades = parseJson<string[]>(profile.sharedDecades, [])
  const moods = parseJson<string[]>(profile.moodPreferences, [])
  const paulSpecific = parseJson<string[]>(profile.paulSpecific, [])
  const rebeccaSpecific = parseJson<string[]>(profile.rebeccaSpecific, [])
  const dislikes = parseJson<string[]>(profile.dislikedPatterns, [])

  return (
    <div className="max-w-xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Couple taste profile</h1>
          {profile.moviesAnalyzed > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">Based on {profile.moviesAnalyzed} movie{profile.moviesAnalyzed !== 1 ? 's' : ''}</p>
          )}
        </div>
        {profile.isUpdating && (
          <span className="text-xs text-muted-foreground animate-pulse">Updating…</span>
        )}
      </div>

      {profile.coupleSummary && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Together</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.coupleSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 border rounded-xl p-4">
        {profile.paulSummary && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Paul</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{profile.paulSummary}</p>
          </div>
        )}
        {profile.rebeccaSummary && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">Rebecca</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{profile.rebeccaSummary}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {sharedGenres.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Shared genres</h3>
            <div className="flex flex-wrap gap-1.5">
              {sharedGenres.map(g => <Badge key={g} variant="secondary">{g}</Badge>)}
            </div>
          </div>
        )}
        {sharedDecades.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Eras</h3>
            <div className="flex flex-wrap gap-1.5">
              {sharedDecades.map(d => <Badge key={d} variant="secondary">{d}</Badge>)}
            </div>
          </div>
        )}
        {sharedDirectors.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Shared directors</h3>
            <div className="flex flex-wrap gap-1.5">
              {sharedDirectors.map(d => <Badge key={d} variant="outline">{d}</Badge>)}
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
        {paulSpecific.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Paul specifically</h3>
            <div className="flex flex-wrap gap-1.5">
              {paulSpecific.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
            </div>
          </div>
        )}
        {rebeccaSpecific.length > 0 && (
          <div>
            <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Rebecca specifically</h3>
            <div className="flex flex-wrap gap-1.5">
              {rebeccaSpecific.map(r => <Badge key={r} variant="outline">{r}</Badge>)}
            </div>
          </div>
        )}
      </div>

      {dislikes.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Both dislike</h3>
          <div className="flex flex-wrap gap-1.5">
            {dislikes.map(d => <Badge key={d} variant="destructive" className="opacity-70">{d}</Badge>)}
          </div>
        </div>
      )}

      <div className="border-t pt-6">
        <h3 className="text-sm font-medium mb-2">Add context</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Tell your curator something about your combined taste that isn't captured above.
        </p>
        <AddCoupleContextForm />
      </div>
    </div>
  )
}
