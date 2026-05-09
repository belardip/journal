export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import Link from 'next/link'
import { AlbumCard } from '@/components/albums/AlbumCard'
import { Button } from '@/components/ui/button'
import { Disc3 } from 'lucide-react'

export default async function AlbumsPage() {
  const latestBatch = await db.recommendationBatch.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { albums: { orderBy: { createdAt: 'asc' } } },
  })

  const pendingOld = latestBatch
    ? await db.album.findMany({
        where: { status: 'recommended', batchId: { not: latestBatch.id, notIn: [latestBatch.id] } },
        orderBy: { createdAt: 'desc' },
        include: { batch: true },
      })
    : []

  const recentListened = await db.album.findMany({
    where: { status: 'listened' },
    orderBy: { listenedAt: 'desc' },
    take: 6,
  })

  const currentAlbums = latestBatch?.albums ?? []

  return (
    <div className="space-y-10">
      {/* Current batch */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {latestBatch ? (latestBatch.prompt ? `"${latestBatch.prompt}"` : 'Latest picks') : 'No picks yet'}
          </h2>
          <Button asChild size="sm">
            <Link href="/albums/recommend">New picks</Link>
          </Button>
        </div>

        {currentAlbums.length === 0 ? (
          <div className="text-center py-24 border rounded-xl bg-muted/30">
            <Disc3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium mb-1">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mb-4">Ask for picks based on your mood or just let AI surprise you.</p>
            <Button asChild><Link href="/albums/recommend">Get recommendations</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {currentAlbums.map(album => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </section>

      {/* Pending from old batches */}
      {pendingOld.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-3">Still unrated</h2>
          <div className="space-y-2">
            {pendingOld.map(album => (
              <AlbumCard key={album.id} album={album} compact />
            ))}
          </div>
        </section>
      )}

      {/* Recently listened */}
      {recentListened.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Recently listened</h2>
            <Link href="/albums/history" className="text-xs text-muted-foreground hover:text-foreground">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recentListened.map(album => (
              <AlbumCard key={album.id} album={album} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
