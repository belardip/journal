export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { AlbumCard } from '@/components/albums/AlbumCard'
import { ratingColor } from '@/lib/albums'
import Image from 'next/image'
import { Star } from 'lucide-react'

function monthLabel(date: Date | null) {
  if (!date) return 'Unknown'
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export default async function HistoryPage() {
  const albums = await db.album.findMany({
    where: { status: 'listened' },
    orderBy: { listenedAt: 'desc' },
  })

  const grouped = albums.reduce<Record<string, typeof albums>>((acc, album) => {
    const key = monthLabel(album.listenedAt)
    if (!acc[key]) acc[key] = []
    acc[key].push(album)
    return acc
  }, {})

  if (!albums.length) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Star className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No albums rated yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Listening history</h1>
      {Object.entries(grouped).map(([month, monthAlbums]) => (
        <section key={month}>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">{month}</h2>
          <div className="space-y-px rounded-xl border overflow-hidden">
            {monthAlbums.map(album => (
              <div key={album.id} className="flex items-center gap-3 p-3 bg-card hover:bg-muted/30 transition-colors">
                {album.artworkUrl ? (
                  <Image src={album.artworkUrl} alt={album.title} width={44} height={44} className="rounded object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded bg-muted flex items-center justify-center shrink-0">
                    <Star className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{album.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{album.artist}{album.year ? ` · ${album.year}` : ''}</p>
                  {album.notes && (
                    <p className="text-xs text-muted-foreground/70 italic truncate mt-0.5">"{album.notes}"</p>
                  )}
                </div>
                {album.rating && (
                  <span className={`text-sm font-bold shrink-0 ${ratingColor(album.rating)}`}>
                    {album.rating}/10
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
