import type { Todo } from '@/generated/prisma/client'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getDayName(date: Date) {
  return DAYS[date.getDay()]
}

function formatDeadline(deadline: Date, now: Date): string {
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return `OVERDUE by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`
  if (diff === 0) return 'due TODAY'
  if (diff === 1) return 'due tomorrow'
  if (diff <= 7) return `due in ${diff} days`
  return `due ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `~${h}h ${m}m` : `~${h}h`
}

export function buildTodoSystemPrompt(todos: Todo[], clientNow?: Date): string {
  const now = clientNow ?? new Date()
  const hour = now.getHours()
  const dayName = getDayName(now)
  const timeLabel = hour < 5 ? 'late night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night'
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  const activeTodos = todos.filter(t => !t.isComplete)
  const completedTodos = todos.filter(t => t.isComplete)

  const formatTodo = (t: Todo) => {
    const parts: string[] = [`- ${t.title}`]
    const meta: string[] = []
    if (t.priority >= 1) meta.push('HIGH PRIORITY')
    if (t.deadline) meta.push(formatDeadline(new Date(t.deadline), now))
    if (t.estimatedMinutes) meta.push(formatEstimate(t.estimatedMinutes))
    if (t.isRecurring) {
      try {
        const days = JSON.parse(t.recurringDays) as string[]
        if (days.length) meta.push(`recurring: ${days.join(', ')}`)
      } catch { /* skip */ }
    }
    if (meta.length) parts.push(`  [${meta.join(' | ')}]`)
    if (t.notes) parts.push(`  Note: ${t.notes}`)
    return parts.join('\n')
  }

  const overdueOrUrgent = activeTodos.filter(t => {
    if (t.deadline) {
      const diff = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 1
    }
    return t.priority >= 1
  })

  const recurringToday = activeTodos.filter(t => {
    if (!t.isRecurring) return false
    try {
      const days = JSON.parse(t.recurringDays) as string[]
      return days.includes(dayName)
    } catch { return false }
  })

  const rest = activeTodos.filter(t => !overdueOrUrgent.includes(t) && !recurringToday.includes(t))

  let taskSection = '## Your Tasks\n\n'

  if (overdueOrUrgent.length) {
    taskSection += '### Urgent / Due Soon\n'
    taskSection += overdueOrUrgent.map(formatTodo).join('\n\n') + '\n\n'
  }

  if (recurringToday.length) {
    taskSection += `### Scheduled for Today (${dayName})\n`
    taskSection += recurringToday.map(formatTodo).join('\n\n') + '\n\n'
  }

  if (rest.length) {
    taskSection += '### Other\n'
    taskSection += rest.map(formatTodo).join('\n\n') + '\n\n'
  }

  if (!activeTodos.length) {
    taskSection += '(No active tasks — everything is done!)\n\n'
  }

  if (completedTodos.length) {
    taskSection += `### Recently Completed\n`
    taskSection += completedTodos.slice(-5).map(t => `- ~~${t.title}~~`).join('\n') + '\n'
  }

  return (
    `You are a practical, direct assistant helping the user figure out what to do right now.\n\n` +
    `## Right Now\n` +
    `It is ${timeStr} on ${dateStr} (${timeLabel}).\n\n` +
    taskSection +
    `## Your Job\n` +
    `- Suggest what the user should do right now based on context: time of day, what's due, what's scheduled today, and what's quick\n` +
    `- Be direct. Don't give a ranked list of 5 options — pick one or two and say why\n` +
    `- If it's late (after 9pm), don't suggest things that require energy or going somewhere\n` +
    `- If the user says "no" or "not in the mood", accept it graciously and suggest something else\n` +
    `- Keep responses short — 2-3 sentences max unless asked for more\n` +
    `- It's okay to be conversational: "what do you feel like?" or "got 10 minutes?"\n` +
    `- If everything is done, say so and let them enjoy it\n`
  )
}
