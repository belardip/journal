'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { rateCoupleMovieAction, skipCoupleMovieAction } from '@/app/actions/couple'
import { ratingColor } from '@/lib/albums'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Film, SkipForward } from 'lucide-react'

type CoupleMovie = {
  id: number
  title: string
  director: string
  year?: number | null
  genre?: string | null
  posterUrl?: string | null
  rtScore?: string | null
  status: string
  paulRating?: number | null
  paulNotes?: string | null
  rebeccaRating?: number | null
  rebeccaNotes?: string | null
  recommendedReason?: string | null
}

function PersonRating({
  person, label, currentRating, onSave, disabled,
}: {
  person: 'paul' | 'rebecca'
  label: string
  currentRating: number | null | undefined
  onSave: (rating: number, notes: string) => Promise<void>
  disabled: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [hover, setHover] = useState(0)
  const [rating, setRating] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, start] = useTransition()

  function submit() {
    if (!rating) return
    start(async () => {
      await onSave(rating, notes)
      setEditing(false)
      setRating(0)
      setNotes('')
    })
  }

  if (currentRating) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
        <span className={`text-xs font-semibold ${ratingColor(currentRating)}`}>{currentRating}/10</span>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
          <div className="flex gap-0.5">
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setRating(r => r === n ? 0 : n)}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                className={`text-base leading-none transition-colors ${
                  n <= (hover || rating) ? 'text-amber-400' : 'text-muted-foreground/25'
                }`}
              >★</button>
            ))}
            {rating > 0 && <span className="text-xs text-muted-foreground ml-1 self-center">{rating}/10</span>}
          </div>
        </div>
        <Textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={2}
          className="text-xs resize-none"
        />
        <div className="flex gap-2">
          <Button size="sm" disabled={!rating || isPending} onClick={submit}>
            {isPending ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRating(0) }}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
      <button
        disabled={disabled}
        onClick={() => setEditing(true)}
        className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        ★★★★★★★★★★ add rating
      </button>
    </div>
  )
}

export function CoupleMovieCard({ movie, compact = false }: { movie: CoupleMovie; compact?: boolean }) {
  const [isPending, start] = useTransition()
  const isSkipped = movie.status === 'skipped'
  const isWatched = movie.status === 'watched'

  async function rate(person: 'paul' | 'rebecca', rating: number, notes: string) {
    await rateCoupleMovieAction(movie.id, person, rating, notes)
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={movie.title} width={30} height={44} className="rounded object-cover shrink-0" />
        ) : (
          <div className="w-8 h-11 rounded bg-muted flex items-center justify-center shrink-0">
            <Film className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{movie.title}</p>
          <p className="text-xs text-muted-foreground truncate">{movie.director}</p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {movie.paulRating && (
            <span className={`text-xs font-semibold ${ratingColor(movie.paulRating)}`}>P {movie.paulRating}/10</span>
          )}
          {movie.rebeccaRating && (
            <span className={`text-xs font-semibold ${ratingColor(movie.rebeccaRating)}`}>R {movie.rebeccaRating}/10</span>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden flex flex-col ${isSkipped ? 'opacity-50' : ''}`}>
      <div className="aspect-2/3 relative bg-muted">
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {(movie.paulRating || movie.rebeccaRating) && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
            {movie.paulRating && (
              <div className="bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">P {movie.paulRating}/10</div>
            )}
            {movie.rebeccaRating && (
              <div className="bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">R {movie.rebeccaRating}/10</div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight">{movie.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{movie.director}</p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {movie.year && <Badge variant="outline" className="text-xs py-0">{movie.year}</Badge>}
            {movie.genre && <Badge variant="outline" className="text-xs py-0">{movie.genre}</Badge>}
            {movie.rtScore && (
              <Badge variant="outline" className="text-xs py-0 text-red-500 border-red-200">
                🍅 {movie.rtScore}
              </Badge>
            )}
          </div>
        </div>

        {movie.recommendedReason && !isWatched && !isSkipped && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2">{movie.recommendedReason}</p>
        )}

        <div className="mt-auto border-t pt-2 space-y-2">
          <PersonRating person="paul" label="Paul" currentRating={movie.paulRating} onSave={(r, n) => rate('paul', r, n)} disabled={isPending} />
          <PersonRating person="rebecca" label="Rebecca" currentRating={movie.rebeccaRating} onSave={(r, n) => rate('rebecca', r, n)} disabled={isPending} />

          {!isWatched && !isSkipped && (
            <Button
              size="sm" variant="ghost"
              disabled={isPending}
              onClick={() => start(async () => { await skipCoupleMovieAction(movie.id) })}
              className="w-full text-muted-foreground"
            >
              <SkipForward className="h-3 w-3 mr-1" /> Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
