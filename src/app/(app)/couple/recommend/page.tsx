'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateCoupleRecommendationsAction } from '@/app/actions/couple'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Film } from 'lucide-react'

const moods = [
  'Something intense', 'Feel-good', 'Slow burn', 'Classic',
  'Foreign film', 'Documentary', 'Date night', 'Adventurous',
]

export default function CoupleRecommendPage() {
  const [prompt, setPrompt] = useState('')
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      try {
        await generateCoupleRecommendationsAction(prompt.trim())
        router.push('/couple')
      } catch {
        setError('The AI service is busy right now — try again in a moment.')
      }
    })
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1">New picks for you two</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Describe a mood, genre, or vibe — or leave it blank to be surprised.
      </p>

      {isPending ? (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <Film className="h-10 w-10 animate-pulse" />
          <div className="text-center">
            <p className="font-medium text-foreground">Finding your picks…</p>
            <p className="text-sm mt-1">This takes about 20–30 seconds.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Textarea
            placeholder={'e.g. "Something we can both enjoy on a Friday night" or leave blank'}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex flex-wrap gap-2">
            {moods.map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setPrompt(p => p ? p : m)}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
              >
                {m}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              <Film className="h-4 w-4 mr-2" />
              Get recommendations
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/couple')}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
