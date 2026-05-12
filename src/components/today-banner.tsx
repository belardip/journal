'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function TodayBanner({ entryDates }: { entryDates: string[] }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(!entryDates.includes(localDateStr()))
  }, [entryDates])

  if (!show) return null

  return (
    <div className="flex items-center gap-3 bg-muted/50 border rounded-lg px-4 py-3 mb-6 text-sm">
      <span className="text-muted-foreground">You haven&apos;t written today yet.</span>
      <Button asChild size="sm" className="ml-auto">
        <Link href="/journal/new">Write now</Link>
      </Button>
    </div>
  )
}
