'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { generateCoupleOnboardingMoviesAction, completeCoupleOnboardingAction } from '@/app/actions/couple'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Film, Loader2 } from 'lucide-react'

type OnboardMovie = {
  title: string
  director: string
  year: number | null
  genre: string | null
  posterUrl: string | null
}

type Ratings = Record<number, { paul: number; rebecca: number }>

function StarRow({
  label, value, onChange,
}: { label: string; value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground w-14 shrink-0">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            className={`text-sm leading-none transition-colors ${
              n <= (hover || value) ? 'text-amber-400' : 'text-muted-foreground/20'
            }`}
          >★</button>
        ))}
      </div>
    </div>
  )
}

export default function CoupleOnboardPage() {
  const router = useRouter()
  const [paulFavs, setPaulFavs] = useState(['', '', '', '', ''])
  const [rebeccaFavs, setRebeccaFavs] = useState(['', '', '', '', ''])
  const [step, setStep] = useState<'favorites' | 'loading' | 'grid' | 'saving'>('favorites')
  const [movies, setMovies] = useState<OnboardMovie[]>([])
  const [ratings, setRatings] = useState<Ratings>({})
  const [isPending, start] = useTransition()

  function setFav(who: 'paul' | 'rebecca', i: number, val: string) {
    if (who === 'paul') setPaulFavs(prev => { const n = [...prev]; n[i] = val; return n })
    else setRebeccaFavs(prev => { const n = [...prev]; n[i] = val; return n })
  }

  function handleFavoritesSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (paulFavs.filter(f => f.trim()).length < 3 || rebeccaFavs.filter(f => f.trim()).length < 3) return
    setStep('loading')
    start(async () => {
      const result = await generateCoupleOnboardingMoviesAction(
        paulFavs.filter(Boolean), rebeccaFavs.filter(Boolean)
      )
      setMovies(result)
      setStep('grid')
    })
  }

  function setRating(idx: number, who: 'paul' | 'rebecca', n: number) {
    setRatings(prev => {
      const current = prev[idx] ?? { paul: 0, rebecca: 0 }
      return { ...prev, [idx]: { ...current, [who]: current[who] === n ? 0 : n } }
    })
  }

  const ratedCount = Object.values(ratings).filter(r => r.paul > 0 || r.rebecca > 0).length

  function handleDone() {
    setStep('saving')
    start(async () => {
      await completeCoupleOnboardingAction(
        movies.map((m, i) => ({
          ...m,
          paulRating: ratings[i]?.paul || null,
          rebeccaRating: ratings[i]?.rebecca || null,
        }))
      )
      router.push('/couple')
    })
  }

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-muted-foreground">
        <Film className="h-10 w-10 animate-pulse" />
        <div className="text-center">
          <p className="font-medium text-foreground">Building your list…</p>
          <p className="text-sm mt-1">Finding films you both might know.</p>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="font-medium text-foreground">Building your couple profile…</p>
      </div>
    )
  }

  if (step === 'grid') {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">Rate what you've seen</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Each person rates independently. Skip anything you haven't watched.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{ratedCount} rated</p>
            <Button size="sm" disabled={ratedCount === 0 || isPending} onClick={handleDone} className="mt-1">
              Done
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {movies.map((movie, i) => {
            const r = ratings[i] ?? { paul: 0, rebecca: 0 }
            const anyRated = r.paul > 0 || r.rebecca > 0
            return (
              <div key={i} className={`rounded-lg border bg-card overflow-hidden flex gap-3 p-3 ${anyRated ? 'border-amber-400/50' : ''}`}>
                <div className="relative bg-muted shrink-0 w-10 h-14 rounded">
                  {movie.posterUrl ? (
                    <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover rounded" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div>
                    <p className="text-xs font-medium leading-tight">{movie.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{movie.director}{movie.year ? ` · ${movie.year}` : ''}</p>
                  </div>
                  <StarRow label="Paul" value={r.paul} onChange={n => setRating(i, 'paul', n)} />
                  <StarRow label="Rebecca" value={r.rebecca} onChange={n => setRating(i, 'rebecca', n)} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">{ratedCount} of {movies.length} rated</p>
          <Button disabled={ratedCount === 0 || isPending} onClick={handleDone}>
            Done — build our profile
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Film className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Set up your couple profile</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Name 3–5 films each of you love. These seed your joint taste profile.
        </p>
      </div>

      <form onSubmit={handleFavoritesSubmit} className="space-y-6">
        <div className="space-y-3">
          <p className="text-sm font-medium">Paul's favourites</p>
          {paulFavs.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <Input
                placeholder={i < 3 ? 'Film title…' : 'Film title (optional)'}
                value={val}
                onChange={e => setFav('paul', i, e.target.value)}
                required={i < 3}
              />
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Rebecca's favourites</p>
          {rebeccaFavs.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
              <Input
                placeholder={i < 3 ? 'Film title…' : 'Film title (optional)'}
                value={val}
                onChange={e => setFav('rebecca', i, e.target.value)}
                required={i < 3}
              />
            </div>
          ))}
        </div>

        <Button
          type="submit"
          disabled={
            paulFavs.filter(f => f.trim()).length < 3 ||
            rebeccaFavs.filter(f => f.trim()).length < 3 ||
            isPending
          }
          className="w-full"
        >
          Continue
        </Button>
      </form>
    </div>
  )
}
