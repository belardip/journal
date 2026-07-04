'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { rateAlbumAction, skipAlbumAction } from '@/app/actions/albums'
import { ratingColor } from '@/lib/albums'
import { RatingButtons } from '@/components/rating-buttons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, SkipForward, ChevronDown, ChevronUp, X } from 'lucide-react'

type Album = {
  id: number
  title: string
  artist: string
  year?: number | null
  genre?: string | null
  artworkUrl?: string | null
  spotifyUrl?: string | null
  status: string
  rating?: number | null
  notes?: string | null
  recommendedReason?: string | null
}

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.719-.66 13.439 1.621.361.181.54.78.301 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
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
          <div className="flex items-center gap-1 shrink-0">
            {album.spotifyUrl && (
              <a
                href={album.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Play in Spotify"
                className="text-[#1DB954] hover:opacity-80 p-1"
              >
                <SpotifyIcon className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground p-1">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              disabled={isPending}
              onClick={() => start(async () => { await skipAlbumAction(album.id) })}
              className="text-muted-foreground hover:text-destructive p-1 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {expanded && isRecommended && (
          <div className="absolute mt-24 z-10 bg-card border rounded-lg shadow-lg p-3 w-64">
            <RatingButtons
              onRate={(rating, notes) => rateAlbumAction(album.id, rating, notes)}
              onDone={() => setExpanded(false)}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border bg-card overflow-hidden flex flex-col ${isSkipped ? 'opacity-50' : ''}`}>
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
                <RatingButtons
                  onRate={(rating, notes) => rateAlbumAction(album.id, rating, notes)}
                  onDone={() => setExpanded(false)}
                />
                <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" onClick={() => setExpanded(true)}>
                  <Star className="h-3 w-3 mr-1" /> Rate
                </Button>
                {album.spotifyUrl && (
                  <Button size="sm" variant="ghost" className="text-[#1DB954] hover:text-[#1DB954]" asChild>
                    <a href={album.spotifyUrl} target="_blank" rel="noopener noreferrer" title="Play in Spotify">
                      <SpotifyIcon className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                )}
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
