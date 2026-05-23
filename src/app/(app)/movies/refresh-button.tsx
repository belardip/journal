'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateMovieRecommendationsAction } from '@/app/actions/movies'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

export function RefreshButton({ prompt }: { prompt: string }) {
  const [isPending, start] = useTransition()
  const router = useRouter()

  function refresh() {
    start(async () => {
      await generateMovieRecommendationsAction(prompt)
      router.refresh()
    })
  }

  return (
    <Button variant="outline" size="sm" onClick={refresh} disabled={isPending}>
      <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Finding more…' : '3 more like this'}
    </Button>
  )
}
