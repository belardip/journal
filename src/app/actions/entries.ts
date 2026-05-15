'use server'

import { after } from 'next/server'
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

  await db.appSettings.upsert({
    where: { key: 'profile_updating_since' },
    update: { value: new Date().toISOString() },
    create: { key: 'profile_updating_since', value: new Date().toISOString() },
  })

  after(async () => {
    await runProfileUpdate(id).catch(console.error)
  })

  revalidatePath('/journal')
  revalidatePath(`/journal/${id}`)
  revalidatePath('/profile')
}
