export const dynamic = 'force-dynamic'
export const metadata = { title: 'Watch History' }

import { db } from '@/lib/db'
import { ratingColor } from '@/lib/albums'
import Image from 'next/image'
import { Film } from 'lucide-react'

function monthLabel(date: Date | null) {
  if (!date) return 'Unknown'
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

export default async function MovieHistoryPage() {
  const movies = await db.movie.findMany({
    where: { status: 'watched' },
    orderBy: { watchedAt: 'desc' },
  })

  const grouped = movies.reduce<Record<string, typeof movies>>((acc, movie) => {
    const key = monthLabel(movie.watchedAt)
    if (!acc[key]) acc[key] = []
    acc[key].push(movie)
    return acc
  }, {})

  if (!movies.length) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>No movies rated yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">Watch history</h1>
      {Object.entries(grouped).map(([month, monthMovies]) => (
        <section key={month}>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">{month}</h2>
          <div className="space-y-px rounded-xl border overflow-hidden">
            {monthMovies.map(movie => (
              <div key={movie.id} className="flex items-center gap-3 p-3 bg-card hover:bg-muted/30 transition-colors">
                {movie.posterUrl ? (
                  <Image src={movie.posterUrl} alt={movie.title} width={30} height={44} className="rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-11 rounded bg-muted flex items-center justify-center shrink-0">
                    <Film className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{movie.director}{movie.year ? ` · ${movie.year}` : ''}</p>
                  {movie.notes && (
                    <p className="text-xs text-muted-foreground/70 italic truncate mt-0.5">"{movie.notes}"</p>
                  )}
                </div>
                {movie.rating && (
                  <span className={`text-sm font-bold shrink-0 ${ratingColor(movie.rating)}`}>
                    {movie.rating}/10
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
