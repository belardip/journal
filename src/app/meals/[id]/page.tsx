import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { MealEditor } from '@/components/meals/MealEditor'

export default async function MealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mealId = Number(id)

  const meal = await db.meal.findUnique({
    where: { id: mealId },
    include: { ingredients: { orderBy: { sortOrder: 'asc' } } },
  })
  if (!meal) notFound()

  const cookSlots = await db.cookSlot.findMany({
    where: { day: meal.day, type: meal.type },
    include: { person: true },
  })
  const cooks = cookSlots.map(s => s.person.name)

  const suggestions = await db.ingredientSuggestion.findMany({ orderBy: { name: 'asc' } })

  return <MealEditor meal={meal} cooks={cooks} suggestions={suggestions.map(s => s.name)} />
}
