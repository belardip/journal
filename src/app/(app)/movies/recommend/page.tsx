'use client'

import { generateMovieRecommendationsAction } from '@/app/actions/movies'
import { RecommendationForm } from '@/components/recommendation-form'
import { Film } from 'lucide-react'

const moods = [
  'Something intense', 'Feel-good', 'Slow burn', 'Classic',
  'Foreign film', 'Documentary', 'Late night', 'Adventurous',
]

export default function MovieRecommendPage() {
  return (
    <RecommendationForm
      title="New picks"
      description="Describe a mood, genre, or vibe — or leave it blank to be surprised."
      placeholder={'e.g. "Something like Kubrick but more accessible" or leave blank'}
      moods={moods}
      icon={Film}
      onSubmit={generateMovieRecommendationsAction}
      successHref="/movies"
      cancelHref="/movies"
    />
  )
}
