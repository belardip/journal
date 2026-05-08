'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { generateJson } from '@/lib/ai'

export async function updateMealAction(id: number, data: {
  name?: string
  recipeUrl?: string
  originalServings?: number
  notes?: string
}) {
  await db.meal.update({ where: { id }, data })
  revalidatePath(`/meals/${id}`)
  revalidatePath('/schedule')
}

export async function addIngredientAction(mealId: number, name: string, quantity?: number, unit?: string) {
  const max = await db.mealIngredient.aggregate({ _max: { sortOrder: true }, where: { mealId } })
  await db.mealIngredient.create({
    data: { mealId, name, quantity: quantity ?? null, unit: unit ?? null, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  revalidatePath(`/meals/${mealId}`)
}

export async function updateIngredientAction(id: number, data: {
  name?: string
  quantity?: number | null
  unit?: string | null
}) {
  await db.mealIngredient.update({ where: { id }, data })
  const ing = await db.mealIngredient.findUnique({ where: { id } })
  if (ing) revalidatePath(`/meals/${ing.mealId}`)
}

export async function deleteIngredientAction(id: number) {
  const ing = await db.mealIngredient.findUnique({ where: { id } })
  await db.mealIngredient.delete({ where: { id } })
  if (ing) revalidatePath(`/meals/${ing.mealId}`)
}

export async function parseMealTextAction(mealId: number, text: string, originalServings: number) {
  const prompt = `Extract all ingredients from this recipe text. Scale the quantities from ${originalServings} servings to 7 servings.
Return ONLY a JSON array with no explanation, no markdown. Format:
[{"name":"flour","quantity":2.5,"unit":"cups"},{"name":"salt","quantity":null,"unit":null}]
If quantity is unknown, use null. If unit is not applicable, use null.

Recipe text:
${text.substring(0, 8000)}`

  const result = await generateJson(prompt) as Array<{ name: string; quantity?: number; unit?: string }>

  await db.mealIngredient.deleteMany({ where: { mealId } })
  for (let i = 0; i < result.length; i++) {
    const ing = result[i]
    if (!ing.name) continue
    await db.mealIngredient.create({
      data: { mealId, name: ing.name, quantity: ing.quantity ?? null, unit: ing.unit ?? null, sortOrder: i },
    })
  }

  revalidatePath(`/meals/${mealId}`)
  return result
}

export async function importRecipeAction(mealId: number, recipeUrl: string, originalServings: number) {
  await db.meal.update({ where: { id: mealId }, data: { recipeUrl, originalServings } })

  const res = await fetch(recipeUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CottageBot/1.0)' },
  })
  if (!res.ok) throw new Error(`Failed to fetch recipe: ${res.status}`)
  const html = await res.text()
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 8000)

  return parseMealTextAction(mealId, text, originalServings)
}
