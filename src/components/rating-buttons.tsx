'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  onRate: (rating: number, notes: string) => Promise<void>
  onDone?: () => void
}

export function RatingButtons({ onRate, onDone }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState('')
  const [isPending, start] = useTransition()

  function submit() {
    if (!rating) return
    start(async () => {
      await onRate(rating, notes)
      onDone?.()
    })
  }

  return (
    <div className="space-y-2 pt-2 border-t">
      <div className="flex gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-lg leading-none transition-colors ${
              n <= (hover || rating) ? 'text-amber-400' : 'text-muted-foreground/30'
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && <span className="text-xs text-muted-foreground ml-1 self-center">{rating}/10</span>}
      </div>
      <Textarea
        placeholder="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={2}
        className="text-sm resize-none"
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={!rating || isPending} onClick={submit}>
          {isPending ? 'Saving…' : 'Rate'}
        </Button>
      </div>
    </div>
  )
}
