'use client'

import { useState, useTransition } from 'react'
import { format, isPast, isToday, isTomorrow } from 'date-fns'
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddTodoSheet } from '@/components/todos/AddTodoSheet'
import { TodoChatInterface } from '@/components/todos/TodoChatInterface'
import { toggleTodoAction, deleteTodoAction } from '@/app/actions/todos'
import { cn } from '@/lib/utils'
import type { Todo } from '@/generated/prisma/client'

interface Props {
  todos: Todo[]
  initialMessages: { role: string; content: string }[]
}

function formatDeadlineBadge(deadline: Date): { label: string; variant: 'destructive' | 'secondary' | 'outline' } {
  if (isPast(deadline) && !isToday(deadline)) return { label: 'Overdue', variant: 'destructive' }
  if (isToday(deadline)) return { label: 'Due today', variant: 'destructive' }
  if (isTomorrow(deadline)) return { label: 'Due tomorrow', variant: 'secondary' }
  return { label: `Due ${format(deadline, 'MMM d')}`, variant: 'outline' }
}

function parseRecurringDays(json: string): string[] {
  try { return JSON.parse(json) } catch { return [] }
}

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function formatRecurringDays(days: string[]): string {
  if (!days.length) return 'recurring'
  const short = { sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat' }
  return days.map(d => short[d as keyof typeof short] ?? d).join(', ')
}

function TodoItem({ todo, onEdit }: { todo: Todo; onEdit: (t: Todo) => void }) {
  const [isPending, startTransition] = useTransition()
  const days = parseRecurringDays(todo.recurringDays)

  function toggle() {
    startTransition(() => toggleTodoAction(todo.id, !todo.isComplete))
  }

  function remove() {
    startTransition(() => deleteTodoAction(todo.id))
  }

  return (
    <div className={cn('group flex items-start gap-3 py-3 px-1 rounded-lg', isPending && 'opacity-50')}>
      <button
        onClick={toggle}
        disabled={isPending}
        className={cn(
          'mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          todo.isComplete
            ? 'bg-primary border-primary'
            : 'border-muted-foreground/40 hover:border-primary'
        )}
        aria-label={todo.isComplete ? 'Mark incomplete' : 'Mark complete'}
      >
        {todo.isComplete && (
          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-snug', todo.isComplete && 'line-through text-muted-foreground')}>
          {todo.priority >= 1 && !todo.isComplete && (
            <span className="text-destructive mr-1">!</span>
          )}
          {todo.title}
        </p>
        {todo.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{todo.notes}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {todo.deadline && (
            <Badge variant={formatDeadlineBadge(new Date(todo.deadline)).variant} className="text-xs py-0 px-1.5">
              {formatDeadlineBadge(new Date(todo.deadline)).label}
            </Badge>
          )}
          {todo.isRecurring && (
            <Badge variant="outline" className="text-xs py-0 px-1.5">
              {formatRecurringDays(days)}
            </Badge>
          )}
          {todo.estimatedMinutes && (
            <Badge variant="outline" className="text-xs py-0 px-1.5 text-muted-foreground">
              {formatEstimate(todo.estimatedMinutes)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(todo)}
          disabled={isPending}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={remove}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function TodosClient({ todos, initialMessages }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editTodo, setEditTodo] = useState<Todo | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const active = todos.filter(t => !t.isComplete)
  const completed = todos.filter(t => t.isComplete)

  function handleEdit(todo: Todo) {
    setEditTodo(todo)
    setSheetOpen(true)
  }

  function handleSheetClose(open: boolean) {
    setSheetOpen(open)
    if (!open) setEditTodo(null)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
      {/* Todo list */}
      <div className="lg:w-105 lg:shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Tasks</h1>
          <Button size="sm" onClick={() => { setEditTodo(null); setSheetOpen(true) }}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add task
          </Button>
        </div>

        <Card>
          {active.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No active tasks — you're all caught up.
            </div>
          ) : (
            <div className="divide-y px-3">
              {active.map(todo => (
                <TodoItem key={todo.id} todo={todo} onEdit={handleEdit} />
              ))}
            </div>
          )}
        </Card>

        {completed.length > 0 && (
          <div>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 mb-2"
              onClick={() => setShowCompleted(v => !v)}
            >
              {showCompleted ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {completed.length} completed
            </button>
            {showCompleted && (
              <Card>
                <div className="divide-y px-3">
                  {completed.map(todo => (
                    <TodoItem key={todo.id} todo={todo} onEdit={handleEdit} />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* AI Chat */}
      <div className="flex-1 min-h-0 lg:min-h-150">
        <TodoChatInterface initialMessages={initialMessages} />
      </div>

      <AddTodoSheet
        key={editTodo?.id ?? 'new'}
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        todo={editTodo}
      />
    </div>
  )
}
