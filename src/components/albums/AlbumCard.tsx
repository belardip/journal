'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { rateAlbumAction, skipAlbumAction } from '@/app/actions/albums'
import { ratingColor } from '@/lib/albums'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Star, SkipForward, ChevronDown, ChevronUp } from 'lucide-react'

type Album = {
  id: number
  title: string
  artist: string
  year?: number | null
  genre?: string | null
  artworkUrl?: string | null
  status: string
  rating?: number | null
  notes?: string | null
  recommendedReason?: string | null
}

function RatingButtons({ albumId, onDone }: { albumId: number; onDone?: () => void }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, start] = useTransition()

  function submit() {
    if (!rating) return
    start(async () => {
      await rateAlbumAction(albumId, rating, notes)
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

export function AlbumCard({ album, compact = false }: { album: Album; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, start] = useTransition()

  const isListened = album.status === 'listened'
  const isSkipped = album.status === 'skipped'
  const isRecommended = album.status === 'recommended'

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
        {album.artworkUrl ? (
          <Image src={album.artworkUrl} alt={album.title} width={40} height={40} className="rounded object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
            <Star className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{album.title}</p>
          <p className="text-xs text-muted-foreground truncate">{album.artist}</p>
        </div>
        {isListened && album.rating && (
          <span className={`text-xs font-semibold shrink-0 ${ratingColor(album.rating)}`}>{album.rating}/10</span>
        )}
        {isRecommended && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
        {expanded && isRecommended && (
          <div className="absolute mt-24 z-10 bg-card border rounded-lg shadow-lg p-3 w-64">
            <RatingButtons albumId={album.id} onDone={() => setExpanded(false)} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden flex flex-col ${isSkipped ? 'opacity-50' : ''}`}>
      {/* Artwork */}
      <div className="aspect-square relative bg-muted">
        {album.artworkUrl ? (
          <Image src={album.artworkUrl} alt={album.title} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Star className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
        {isListened && album.rating && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {album.rating}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          <p className="font-semibold text-sm leading-tight">{album.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{album.artist}</p>
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {album.year && <Badge variant="outline" className="text-xs py-0">{album.year}</Badge>}
            {album.genre && <Badge variant="outline" className="text-xs py-0">{album.genre}</Badge>}
          </div>
        </div>

        {album.recommendedReason && !isListened && !isSkipped && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t pt-2">{album.recommendedReason}</p>
        )}

        {isListened && album.notes && (
          <p className="text-xs text-muted-foreground italic border-t pt-2">"{album.notes}"</p>
        )}

        {isRecommended && (
          <div className="mt-auto space-y-2 border-t pt-2">
            {expanded ? (
              <>
                <RatingButtons albumId={album.id} onDone={() => setExpanded(false)} />
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
                  onClick={() => start(async () => { await skipAlbumAction(album.id) })}
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
