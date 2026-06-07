'use client'

import { generateCoupleRecommendationsAction } from '@/app/actions/couple'
import { RecommendationForm } from '@/components/recommendation-form'
import { Film } from 'lucide-react'

const moods = [
  'Something intense', 'Feel-good', 'Slow burn', 'Classic',
  'Foreign film', 'Documentary', 'Date night', 'Adventurous',
]

export default function CoupleRecommendPage() {
  return (
    <RecommendationForm
      title="New picks for you two"
      description="Describe a mood, genre, or vibe — or leave it blank to be surprised."
      placeholder={'e.g. "Something we can both enjoy on a Friday night" or leave blank'}
      moods={moods}
      icon={Film}
      onSubmit={generateCoupleRecommendationsAction}
      successHref="/couple"
      cancelHref="/couple"
    />
  )
}
