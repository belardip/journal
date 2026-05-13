'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { runProfileUpdate } from '@/lib/updateProfile'

export async function createEntryAction(date: string, timeOfDay: string | null, content: string) {
  const entry = await db.journalEntry.create({
    data: { date, timeOfDay, content },
  })
  revalidatePath('/journal')
  return { id: entry.id }
}

export async function finalizeEntryAction(id: number) {
  await db.journalEntry.update({
    where: { id },
    data: { sessionComplete: true },
  })

  runProfileUpdate(id).catch(console.error)

  revalidatePath('/journal')
  revalidatePath(`/journal/${id}`)
  revalidatePath('/profile')
}
