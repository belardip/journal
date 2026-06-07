import { db } from '@/lib/db'
import { TodosClient } from './todos-client'

export default async function TodosPage() {
  const [todos, chatHistory] = await Promise.all([
    db.todo.findMany({
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }, { createdAt: 'asc' }],
    }),
    db.todoChatMessage.findMany({
      orderBy: { order: 'asc' },
      take: 20,
    }),
  ])

  const messages = chatHistory.map(m => ({ role: m.role, content: m.content }))

  return <TodosClient todos={todos} initialMessages={messages} />
}
