'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { rateMovieAction, skipMovieAction } from '@/app/actions/movies'
import { ratingColor } from '@/lib/albums'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Film, Star, SkipForward, ChevronDown, ChevronUp, X } from 'lucide-react'

type Movie = {
  id: number
  title: string
  director: string
  year?: number | null
  genre?: string | null
  posterUrl?: string | null
  rtScore?: string | null
  actors?: string | null
  status: string
  rating?: number | null
  notes?: string | null
  recommendedReason?: string | null
}

function RatingButtons({ movieId, onDone }: { movieId: number; onDone?: () => void }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, start] = useTransition()

  function submit() {
    if (!rating) return
    start(async () => {
      await rateMovieAction(movieId, rating, notes)
      onDone?.()
    })
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-lg leading-none transition-colors ${
              n <= (hover || rating) ? 'text-amber-400' : 'text-muted-foreground/30'
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && <span className="text-xs text-muted-foreground ml-1 self-center">{rating}/10</span>}
      </div>
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={!rating || isPending} onClick={submit}>
          {isPending ? 'Saving…' : 'Rate'}
        </Button>
      </div>
    </div>
  )
}

export function MovieCard({ movie, compact = false }: { movie: Movie; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, start] = useTransition()

  const isWatched = movie.status === 'watched'
  const isSkipped = movie.status === 'skipped'
  const isRecommended = movie.status === 'recommended'

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
        {isWatched && movie.rating && (
          <span className={`text-xs font-semibold shrink-0 ${ratingColor(movie.rating)}`}>{movie.rating}/10</span>
        )}
        {isRecommended && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-muted-foreground hover:text-foreground p-1"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              disabled={isPending}
              onClick={() => start(async () => { await skipMovieAction(movie.id) })}
              className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {expanded && isRecommended && (
          <div className="absolute mt-24 z-10 bg-card border rounded-lg shadow-lg p-3 w-64">
            <RatingButtons movieId={movie.id} onDone={() => setExpanded(false)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden flex flex-col ${isSkipped ? 'opacity-50' : ''}`}>
      {/* Poster */}
      <div className="aspect-2/3 relative bg-muted">
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {isWatched && movie.rating && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {movie.rating}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight">{movie.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{movie.director}</p>
          {movie.actors && <p className="text-xs text-muted-foreground/70 mt-0.5">{movie.actors}</p>}
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

        {isWatched && movie.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-2">"{movie.notes}"</p>
        )}

        {isRecommended && (
          <div className="mt-auto space-y-2 border-t pt-2">
            {expanded ? (
              <>
                <RatingButtons movieId={movie.id} onDone={() => setExpanded(false)} />
                <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setExpanded(true)}>
                  <Star className="h-3 w-3 mr-1" /> Rate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => start(async () => { await skipMovieAction(movie.id) })}
                >
                  <SkipForward className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
