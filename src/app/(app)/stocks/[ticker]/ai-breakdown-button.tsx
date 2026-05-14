'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { getTickerBreakdownAction } from '@/app/actions/stocks'
import type { RangeKey } from '@/lib/stocks'

export function AiBreakdownButton({ ticker, name, changePercent, range }: {
  ticker: string
  name: string
  changePercent: number
  range: RangeKey
}) {
  const [result, setResult] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      const text = await getTickerBreakdownAction({ ticker, name, changePercent, range })
      setResult(text)
    })
  }

  if (result) {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s going on</p>
          <button onClick={() => setResult(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Dismiss
          </button>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-line">{result}</p>
      </div>
    )
  }

  return (
    <button
      onClick={load}
      disabled={pending}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
    >
      <Sparkles className="h-4 w-4" />
      {pending ? 'Looking up news…' : "What's going on?"}
    </button>
  )
}
