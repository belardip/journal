'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'

interface Props {
  title: string
  description: string
  placeholder: string
  moods: string[]
  icon: React.ElementType
  loadingLabel?: string
  onSubmit: (prompt: string, tasteWeight: number) => Promise<void>
  successHref: string
  cancelHref: string
  showTasteSlider?: boolean
}

export function RecommendationForm({
  title,
  description,
  placeholder,
  moods,
  icon: Icon,
  loadingLabel = 'Finding your picks…',
  onSubmit,
  successHref,
  cancelHref,
  showTasteSlider = false,
}: Props) {
  const [prompt, setPrompt] = useState('')
  const [tasteWeight, setTasteWeight] = useState(100)
  const [isPending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    start(async () => {
      try {
        await onSubmit(prompt.trim(), tasteWeight)
        router.push(successHref)
      } catch {
        setError('The AI service is busy right now — try again in a moment.')
      }
    })
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{description}</p>

      {isPending ? (
        <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
          <Icon className="h-10 w-10 animate-spin" />
          <div className="text-center">
            <p className="font-medium text-foreground">{loadingLabel}</p>
            <p className="text-sm mt-1">This takes about 20–30 seconds.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Textarea
            placeholder={placeholder}
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

          {showTasteSlider && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span>Use taste profile</span>
                <span className="text-xs text-muted-foreground">{tasteWeight}%</span>
              </div>
              <Slider value={[tasteWeight]} onValueChange={([v]) => setTasteWeight(v)} min={0} max={100} step={10} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Surprise me</span>
                <span>Stick to my taste</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" className="flex-1">
              <Icon className="h-4 w-4 mr-2" />
              Get recommendations
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(cancelHref)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
