'use client'

import { useState, useTransition } from 'react'
import { ListChecks, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { addHoldingAction, removeHoldingAction, updateHoldingAction } from '@/app/actions/stocks'
import type { HoldingRow } from './holdings-chart'

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function EditableRow({ holding }: { holding: HoldingRow }) {
  const [shares, setShares] = useState(String(holding.shares))
  const [avgPrice, setAvgPrice] = useState(String(holding.avgPrice))
  const [saving, startSaving] = useTransition()
  const [removing, startRemoving] = useTransition()

  function save(next: { shares?: string; avgPrice?: string }) {
    const sharesNum = parseFloat(next.shares ?? shares) || 0
    const avgPriceNum = parseFloat(next.avgPrice ?? avgPrice) || 0
    if (sharesNum === holding.shares && avgPriceNum === holding.avgPrice) return
    startSaving(async () => {
      await updateHoldingAction({ ticker: holding.ticker, shares: sharesNum, avgPrice: avgPriceNum })
    })
  }

  function remove() {
    startRemoving(async () => { await removeHoldingAction(holding.ticker) })
  }

  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border/60 last:border-0">
      <div className="w-20 shrink-0 overflow-hidden">
        <div className="font-mono font-semibold text-sm">{holding.ticker}</div>
        <div className="text-[11px] text-muted-foreground truncate">{holding.name}</div>
      </div>
      <Input
        type="number"
        value={shares}
        onChange={e => setShares(e.target.value)}
        onBlur={() => save({ shares })}
        disabled={saving || removing}
        className="h-8 w-16 text-sm"
        aria-label="Shares"
      />
      <Input
        type="number"
        value={avgPrice}
        onChange={e => setAvgPrice(e.target.value)}
        onBlur={() => save({ avgPrice })}
        disabled={saving || removing}
        className="h-8 w-20 text-sm"
        aria-label="Avg price"
      />
      <span className="flex-1 text-right text-sm tabular-nums text-muted-foreground">
        {money(parseFloat(shares) * parseFloat(avgPrice) || 0)}
      </span>
      <button
        onClick={remove}
        disabled={removing}
        title="Remove holding"
        className="text-muted-foreground hover:text-destructive transition-colors shrink-0 disabled:opacity-40"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

function AddRow() {
  const [ticker, setTicker] = useState('')
  const [shares, setShares] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function add() {
    if (!ticker.trim() || pending) return
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
      }
    })
  }

  return (
    <div className="pt-3 mt-2 border-t">
      <div className="flex items-center gap-2 flex-wrap pt-3">
        <Input
          value={ticker}
          onChange={e => setTicker(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Ticker"
          className="h-8 w-20 text-sm uppercase"
        />
        <Input
          type="number"
          value={shares}
          onChange={e => setShares(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Shares"
          className="h-8 w-16 text-sm"
        />
        <Input
          type="number"
          value={avgPrice}
          onChange={e => setAvgPrice(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Avg price"
          className="h-8 w-20 text-sm"
        />
        <Button size="sm" onClick={add} disabled={pending || !ticker.trim()} className="h-8">
          <Plus className="h-3.5 w-3.5" />
          {pending ? 'Adding...' : 'Add'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  )
}

export function ManagePortfolioDialog({ holdings }: { holdings: HoldingRow[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ListChecks className="h-3.5 w-3.5" />
          Manage portfolio
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Portfolio</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto -mx-1 px-1">
          {holdings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No holdings yet — add one below.</p>
          ) : (
            holdings.map(h => <EditableRow key={h.ticker} holding={h} />)
          )}
        </div>

        <AddRow />
      </DialogContent>
    </Dialog>
  )
}
