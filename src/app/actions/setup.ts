'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export async function saveTripDateAction(dateStr: string) {
  await db.setting.updateMany({
    data: { tripStartDate: dateStr ? new Date(dateStr) : null },
  })
  revalidatePath('/setup')
  revalidatePath('/schedule')
}

export async function addStoreAction(name: string, assignedPersonId?: number) {
  const max = await db.store.aggregate({ _max: { sortOrder: true } })
  await db.store.create({
    data: { name, assignedPersonId: assignedPersonId ?? null, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  revalidatePath('/setup')
}

export async function updateStoreAction(id: number, data: {
  name?: string
  assignedPersonId?: number | null
}) {
  await db.store.update({ where: { id }, data })
  revalidatePath('/setup')
  revalidatePath('/shopping')
}

export async function deleteStoreAction(id: number) {
  await db.store.delete({ where: { id } })
  revalidatePath('/setup')
  revalidatePath('/shopping')
}
