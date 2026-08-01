'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
import { getPortfolioNewsAction } from '@/app/actions/stocks'
import type { HoldingRow } from './holdings-chart'
import ReactMarkdown from 'react-markdown'

export function AiNewsButton({ holdings }: { holdings: HoldingRow[] }) {
  const [result, setResult] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function loadNews() {
    startTransition(async () => {
      const text = await getPortfolioNewsAction(
        holdings.map(h => ({ ticker: h.ticker, name: h.name, price: h.price }))
      )
      setResult(text)
    })
  }

  if (result) {
    return (
      <div className="rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What&apos;s moving</p>
          <button
            onClick={() => setResult(null)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={loadNews}
      disabled={pending}
      className="flex items-center gap-2 text-[13px] font-medium text-foreground bg-background border border-input px-3.5 py-2 rounded-[10px] hover:bg-accent transition-colors disabled:opacity-50"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {pending ? 'Looking up news…' : "What's moving"}
    </button>
  )
}
