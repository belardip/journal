export const dynamic = 'force-dynamic'

import { db } from '@/lib/db'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const levelColor: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default async function LogsPage() {
  const batches = await db.recommendationBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      logs: { orderBy: { createdAt: 'asc' } },
      albums: { select: { id: true, title: true, artist: true, status: true } },
    },
  })

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Recommendation logs</h1>

      {batches.length === 0 ? (
        <p className="text-sm text-muted-foreground">No batches yet.</p>
      ) : batches.map(batch => (
        <section key={batch.id} className="border rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">
                {batch.prompt ? `"${batch.prompt}"` : 'No prompt'}
              </span>
              <span className="text-xs text-muted-foreground ml-3">
                {batch.createdAt.toLocaleString()}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">{batch.albums.length} album{batch.albums.length !== 1 ? 's' : ''}</span>
          </div>

          {batch.albums.length > 0 && (
            <div className="px-4 py-2 border-b flex flex-wrap gap-2">
              {batch.albums.map(a => (
                <span key={a.id} className="text-xs text-muted-foreground">
                  {a.artist} — {a.title}
                  <span className="ml-1 opacity-60">({a.status})</span>
                </span>
              ))}
            </div>
          )}

          <div className="divide-y">
            {batch.logs.map(log => (
              <div key={log.id} className="px-4 py-2.5 flex items-start gap-3 text-xs font-mono">
                <span className={cn('shrink-0 px-1.5 py-0.5 rounded text-xs font-medium', levelColor[log.level] ?? levelColor.info)}>
                  {log.level}
                </span>
                <span className="text-muted-foreground shrink-0">{log.event}</span>
                <pre className="text-xs text-muted-foreground/70 overflow-x-auto whitespace-pre-wrap break-all min-w-0">
                  {JSON.stringify(JSON.parse(log.detail), null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
