'use client'

import { useState, useTransition } from 'react'
import { addMovieProfileContextAction } from '@/app/actions/movies'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function AddMovieContextForm() {
  const [text, setText] = useState('')
  const [isPending, start] = useTransition()
  const [done, setDone] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    start(async () => {
      await addMovieProfileContextAction(text.trim())
      setText('')
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Textarea
        placeholder="e.g. I prefer films with strong character development over plot-driven blockbusters"
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        className="resize-none text-sm"
        disabled={isPending}
      />
      <div className="flex items-center gap-3">
        <Button size="sm" type="submit" disabled={!text.trim() || isPending}>
          {isPending ? 'Updating…' : 'Update profile'}
        </Button>
        {done && <span className="text-xs text-green-600">Profile updated</span>}
      </div>
    </form>
  )
}
