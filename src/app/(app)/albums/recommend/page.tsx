'use client'

import { generateRecommendationsAction } from '@/app/actions/albums'
import { RecommendationForm } from '@/components/recommendation-form'
import { Disc3 } from 'lucide-react'

const moods = [
  'Something chill', 'High energy', 'Something sad', 'Feel-good',
  'Late night', 'Focus/work', 'Adventurous', 'Nostalgic',
]

export default function RecommendPage() {
  return (
    <RecommendationForm
      title="New picks"
      description="Describe a mood, genre, or vibe — or leave it blank to be surprised."
      placeholder={'e.g. "Something like Joni Mitchell but more experimental" or leave blank'}
      moods={moods}
      icon={Disc3}
      onSubmit={generateRecommendationsAction}
      successHref="/albums"
      cancelHref="/albums"
    />
  )
}
