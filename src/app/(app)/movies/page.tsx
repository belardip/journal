export const dynamic = 'force-dynamic'
export const metadata = { title: 'Movies' }

import { db } from '@/lib/db'
import Link from 'next/link'
import { MovieCard } from '@/components/movies/MovieCard'
import { Button } from '@/components/ui/button'
import { Film } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function MoviesPage() {
  const [profile, watchedCount] = await Promise.all([
    db.movieTasteProfile.findFirst(),
    db.movie.count({ where: { status: 'watched' } }),
  ])
  if (!profile && watchedCount === 0) redirect('/movies/onboard')

  const latestBatch = await db.movieRecommendationBatch.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { movies: { orderBy: { createdAt: 'asc' } } },
  })

  const pendingOld = latestBatch
    ? await db.movie.findMany({
        where: { status: 'recommended', batchId: { not: latestBatch.id, notIn: [latestBatch.id] } },
        orderBy: { createdAt: 'desc' },
        include: { batch: true },
      })
    : []

  const recentWatched = await db.movie.findMany({
    where: { status: 'watched' },
    orderBy: { watchedAt: 'desc' },
    take: 6,
  })

  const currentMovies = latestBatch?.movies ?? []

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {latestBatch ? (latestBatch.prompt ? `"${latestBatch.prompt}"` : 'Latest picks') : 'No picks yet'}
          </h2>
        </div>

        {currentMovies.length === 0 ? (
          <div className="text-center py-24 border rounded-xl bg-muted/30">
            <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mb-4">Ask for picks based on your mood or just let AI surprise you.</p>
            <Button asChild><Link href="/movies/recommend">Get recommendations</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {pendingOld.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Still unwatched</h2>
          <div className="space-y-2">
            {pendingOld.map(movie => (
              <MovieCard key={movie.id} movie={movie} compact />
            ))}
          </div>
        </section>
      )}

      {recentWatched.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Recently watched</h2>
            <Link href="/movies/history" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentWatched.map(movie => (
              <MovieCard key={movie.id} movie={movie} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
