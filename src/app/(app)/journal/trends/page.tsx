import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MoodHeatmap } from './mood-heatmap'
import { MoodChart } from './mood-chart'

export default async function TrendsPage() {
  const entries = await db.journalEntry.findMany({
    where: { sessionComplete: true },
    select: { id: true, date: true, mood: true, moodScore: true, summary: true },
    orderBy: { date: 'asc' },
  })

  const withScore = entries.filter(e => e.moodScore != null)

  const monthMap = new Map<string, { sum: number; count: number }>()
  for (const e of withScore) {
    const key = e.date.slice(0, 7)
    const cur = monthMap.get(key) ?? { sum: 0, count: 0 }
    monthMap.set(key, { sum: cur.sum + (e.moodScore ?? 0), count: cur.count + 1 })
  }

  const now = new Date()
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const m = monthMap.get(key)
    return m ? { label, avg: m.sum / m.count, count: m.count } : { label, avg: 0, count: 0 }
  }).filter(m => m.count > 0)

  const allScores = withScore.map(e => e.moodScore!)
  const overallAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null
  const recentScores = withScore.slice(-10).map(e => e.moodScore!)
  const recentAvg = recentScores.length ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Trends</h1>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm py-12 text-center">
          Complete a few journal sessions to see your mood trends.
        </p>
      ) : (
        <>
          {overallAvg !== null && (
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Overall avg mood</p>
                  <p className="text-2xl font-semibold tabular-nums">{overallAvg.toFixed(1)}<span className="text-sm text-muted-foreground font-normal">/10</span></p>
                  <p className="text-xs text-muted-foreground">{withScore.length} entries</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">Recent avg mood</p>
                  <p className="text-2xl font-semibold tabular-nums">{recentAvg?.toFixed(1) ?? '—'}<span className="text-sm text-muted-foreground font-normal">/10</span></p>
                  <p className="text-xs text-muted-foreground">last 10 entries</p>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly mood</CardTitle>
            </CardHeader>
            <CardContent>
              {monthData.length > 0 ? (
                <MoodChart data={monthData} />
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">Not enough data yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Daily mood</CardTitle>
            </CardHeader>
            <CardContent>
              <MoodHeatmap entries={withScore} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
