'use client'

import { useState, useTransition } from 'react'
import { addHoldingAction } from '@/app/actions/stocks'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export function AddHoldingForm() {
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await addHoldingAction({
        ticker,
        shares: parseFloat(shares) || 0,
        avgPrice: parseFloat(avgPrice) || 0,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setTicker('')
        setShares('')
        setAvgPrice('')
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        + Add stock
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3 bg-card">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="ticker" className="text-xs">Ticker</Label>
          <Input
            id="ticker"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="AMD"
            className="mt-1 uppercase"
            autoFocus
          />
        </div>
        <div>
          <Label htmlFor="shares" className="text-xs">Shares</Label>
          <Input
            id="shares"
            type="number"
            value={shares}
            onChange={e => setShares(e.target.value)}
            placeholder="10"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="avgPrice" className="text-xs">Avg price paid</Label>
          <Input
            id="avgPrice"
            type="number"
            value={avgPrice}
            onChange={e => setAvgPrice(e.target.value)}
            placeholder="95.00"
            className="mt-1"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Checking...' : 'Add'}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => { setOpen(false); setError('') }}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
