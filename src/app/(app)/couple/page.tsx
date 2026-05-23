export const dynamic = 'force-dynamic'
export const metadata = { title: 'Couple Movies' }

import { db } from '@/lib/db'
import Link from 'next/link'
import { CoupleMovieCard } from '@/components/couple/CoupleMovieCard'
import { Button } from '@/components/ui/button'
import { Film } from 'lucide-react'
import { redirect } from 'next/navigation'
import { RefreshButton } from './refresh-button'

export default async function CoupleMoviesPage() {
  const [profile, watchedCount] = await Promise.all([
    db.coupleTasteProfile.findFirst(),
    db.coupleMovie.count({ where: { OR: [{ paulRating: { not: null } }, { rebeccaRating: { not: null } }] } }),
  ])
  if (!profile && watchedCount === 0) redirect('/couple/onboard')

  const latestBatch = await db.coupleMovieRecommendationBatch.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { movies: { orderBy: { createdAt: 'asc' } } },
  })

  const pendingOld = latestBatch
    ? await db.coupleMovie.findMany({
        where: { status: 'recommended', batchId: { not: latestBatch.id } },
        orderBy: { createdAt: 'desc' },
      })
    : []

  const recentWatched = await db.coupleMovie.findMany({
    where: { status: 'watched' },
    orderBy: { watchedAt: 'desc' },
    take: 6,
  })

  const currentMovies = (latestBatch?.movies ?? []).filter(m => m.status !== 'skipped')

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {latestBatch ? (latestBatch.prompt ? `"${latestBatch.prompt}"` : 'Latest picks') : 'No picks yet'}
          </h2>
          {latestBatch && <RefreshButton prompt={latestBatch.prompt ?? ''} />}
        </div>

        {currentMovies.length === 0 ? (
          <div className="text-center py-24 border rounded-xl bg-muted/30">
            <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mb-4">Ask for picks based on your mood or let the AI surprise you both.</p>
            <Button asChild><Link href="/couple/recommend">Get recommendations</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentMovies.map(movie => (
              <CoupleMovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </section>

      {pendingOld.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Still unwatched</h2>
          <div className="space-y-2">
            {pendingOld.map(movie => (
              <CoupleMovieCard key={movie.id} movie={movie} compact />
            ))}
          </div>
        </section>
      )}

      {recentWatched.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Recently watched</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentWatched.map(movie => (
              <CoupleMovieCard key={movie.id} movie={movie} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
