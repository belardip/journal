'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export type TodoData = {
  title: string
  notes?: string
  deadline?: string | null
  isRecurring?: boolean
  recurringDays?: string[]
  estimatedMinutes?: number | null
  priority?: number
}

export async function getTodosAction() {
  return db.todo.findMany({
    orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'asc' }],
  })
}

export async function createTodoAction(data: TodoData) {
  await db.todo.create({
    data: {
      title: data.title,
      notes: data.notes || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      isRecurring: data.isRecurring ?? false,
      recurringDays: JSON.stringify(data.recurringDays ?? []),
      estimatedMinutes: data.estimatedMinutes ?? null,
      priority: data.priority ?? 0,
    },
  })
  revalidatePath('/todos')
}

export async function updateTodoAction(id: number, data: TodoData) {
  await db.todo.update({
    where: { id },
    data: {
      title: data.title,
      notes: data.notes || null,
      deadline: data.deadline ? new Date(data.deadline) : null,
      isRecurring: data.isRecurring ?? false,
      recurringDays: JSON.stringify(data.recurringDays ?? []),
      estimatedMinutes: data.estimatedMinutes ?? null,
      priority: data.priority ?? 0,
    },
  })
  revalidatePath('/todos')
}

export async function toggleTodoAction(id: number, isComplete: boolean) {
  await db.todo.update({
    where: { id },
    data: {
      isComplete,
      completedAt: isComplete ? new Date() : null,
    },
  })
  revalidatePath('/todos')
}

export async function deleteTodoAction(id: number) {
  await db.todo.delete({ where: { id } })
  revalidatePath('/todos')
}
