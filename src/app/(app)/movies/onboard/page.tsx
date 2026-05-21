'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { generateOnboardingMoviesAction, completeMovieOnboardingAction } from '@/app/actions/movies'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Film, Loader2 } from 'lucide-react'

type OnboardMovie = {
  title: string
  director: string
  year: number | null
  genre: string | null
  posterUrl: string | null
  rating: number | null
}

function StarRating({ value, onChange }: { value: number | null; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`text-base leading-none transition-colors ${
            n <= (hover || value || 0) ? 'text-amber-400' : 'text-muted-foreground/25'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function MovieOnboardPage() {
  const router = useRouter()

  // Step 1 state
  const [favorites, setFavorites] = useState(['', '', '', '', ''])
  const [step, setStep] = useState<'favorites' | 'loading' | 'grid' | 'saving'>('favorites')
  const [movies, setMovies] = useState<OnboardMovie[]>([])
  const [ratings, setRatings] = useState<Record<number, number>>({})
  const [isPending, start] = useTransition()

  function setFav(i: number, val: string) {
    setFavorites(prev => { const next = [...prev]; next[i] = val; return next })
  }

  function handleFavoritesSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filled = favorites.filter(f => f.trim())
    if (filled.length < 3) return
    setStep('loading')
    start(async () => {
      const result = await generateOnboardingMoviesAction(filled)
      setMovies(result.map(m => ({ ...m, posterUrl: m.posterUrl ?? null, rating: null })))
      setStep('grid')
    })
  }

  function setRating(idx: number, rating: number) {
    setRatings(prev => {
      if (prev[idx] === rating) {
        const next = { ...prev }
        delete next[idx]
        return next
      }
      return { ...prev, [idx]: rating }
    })
  }

  function handleDone() {
    const toSave = movies
      .map((m, i) => ({ ...m, rating: ratings[i] ?? null }))
      .filter(m => m.rating !== null) as (OnboardMovie & { rating: number })[]

    if (!toSave.length) return
    setStep('saving')
    start(async () => {
      await completeMovieOnboardingAction(toSave)
      router.push('/movies')
    })
  }

  const ratedCount = Object.keys(ratings).length

  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-muted-foreground">
        <Film className="h-10 w-10 animate-pulse" />
        <div className="text-center">
          <p className="font-medium text-foreground">Building your list…</p>
          <p className="text-sm mt-1">Finding films you might know.</p>
        </div>
      </div>
    )
  }

  if (step === 'saving') {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="font-medium text-foreground">Building your taste profile…</p>
      </div>
    )
  }

  if (step === 'grid') {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-xl font-semibold">Rate what you've seen</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Skip anything you haven't watched.</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{ratedCount} rated</p>
            <Button
              size="sm"
              disabled={ratedCount === 0 || isPending}
              onClick={handleDone}
              className="mt-1"
            >
              Done
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {movies.map((movie, i) => {
            const rated = ratings[i] ?? null
            return (
              <div
                key={i}
                className={`rounded-lg border bg-card overflow-hidden flex flex-col transition-colors ${
                  rated ? 'border-amber-400/50' : ''
                }`}
              >
                <div className="aspect-2/3 relative bg-muted shrink-0">
                  {movie.posterUrl ? (
                    <Image src={movie.posterUrl} alt={movie.title} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Film className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  {rated && (
                    <div className="absolute top-1.5 right-1.5 bg-black/75 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                      {rated}/10
                    </div>
                  )}
                </div>
                <div className="p-2 flex flex-col gap-1.5 flex-1">
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight line-clamp-2">{movie.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{movie.director}{movie.year ? ` · ${movie.year}` : ''}</p>
                  </div>
                  <StarRating value={rated} onChange={r => setRating(i, r)} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">{ratedCount} of {movies.length} rated</p>
          <Button disabled={ratedCount === 0 || isPending} onClick={handleDone}>
            Done — build my profile
          </Button>
        </div>
      </div>
    )
  }

  // Step 1: favorites form
  return (
    <div className="max-w-md space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Film className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Set up your movie profile</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Name 3–5 films you love. These seed your taste profile so recommendations feel personal from day one.
        </p>
      </div>

      <form onSubmit={handleFavoritesSubmit} className="space-y-3">
        {favorites.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
            <Input
              placeholder={i < 3 ? 'Film title…' : 'Film title (optional)'}
              value={val}
              onChange={e => setFav(i, e.target.value)}
              required={i < 3}
            />
          </div>
        ))}

        <Button
          type="submit"
          disabled={favorites.filter(f => f.trim()).length < 3 || isPending}
          className="w-full mt-2"
        >
          Continue
        </Button>
      </form>
    </div>
  )
}
