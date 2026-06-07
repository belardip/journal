'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createTodoAction, updateTodoAction } from '@/app/actions/todos'
import type { Todo } from '@/generated/prisma/client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_VALUES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

const ESTIMATES = [
  { label: '5 min', value: '5' },
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '1 hour', value: '60' },
  { label: '2+ hours', value: '120' },
]

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  todo?: Todo | null
}

export function AddTodoSheet({ open, onOpenChange, todo }: Props) {
  const isEdit = !!todo
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(todo?.title ?? '')
  const [notes, setNotes] = useState(todo?.notes ?? '')
  const [deadline, setDeadline] = useState<Date | undefined>(
    todo?.deadline ? new Date(todo.deadline) : undefined
  )
  const [isRecurring, setIsRecurring] = useState(todo?.isRecurring ?? false)
  const [selectedDays, setSelectedDays] = useState<string[]>(() => {
    if (!todo?.recurringDays) return []
    try { return JSON.parse(todo.recurringDays) } catch { return [] }
  })
  const [estimate, setEstimate] = useState<string>(
    todo?.estimatedMinutes ? String(todo.estimatedMinutes) : ''
  )
  const [priority, setPriority] = useState(todo?.priority ?? 0)

  function resetForm() {
    setTitle('')
    setNotes('')
    setDeadline(undefined)
    setIsRecurring(false)
    setSelectedDays([])
    setEstimate('')
    setPriority(0)
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  function handleSubmit() {
    if (!title.trim()) return

    const data = {
      title: title.trim(),
      notes: notes.trim() || undefined,
      deadline: deadline ? deadline.toISOString() : null,
      isRecurring,
      recurringDays: isRecurring ? selectedDays : [],
      estimatedMinutes: estimate ? parseInt(estimate) : null,
      priority,
    }

    startTransition(async () => {
      if (isEdit && todo) {
        await updateTodoAction(todo.id, data)
      } else {
        await createTodoAction(data)
        resetForm()
      }
      onOpenChange(false)
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit task' : 'Add task'}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6 px-1">
          <div className="space-y-1.5">
            <Label htmlFor="title">Task</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to get done?"
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Context, details, reminders..."
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Priority</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={priority === 0 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriority(0)}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={priority === 1 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPriority(1)}
              >
                High
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Deadline (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !deadline && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {deadline ? format(deadline, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={deadline}
                  onSelect={setDeadline}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {deadline && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setDeadline(undefined)}
              >
                Clear deadline
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Estimated time (optional)</Label>
            <Select value={estimate} onValueChange={setEstimate}>
              <SelectTrigger>
                <SelectValue placeholder="How long will this take?" />
              </SelectTrigger>
              <SelectContent>
                {ESTIMATES.map(e => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estimate && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setEstimate('')}
              >
                Clear estimate
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={isRecurring}
                onClick={() => setIsRecurring(v => !v)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  isRecurring ? 'bg-primary' : 'bg-input'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform',
                    isRecurring ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
              <Label className="cursor-pointer" onClick={() => setIsRecurring(v => !v)}>
                Recurring task
              </Label>
            </div>

            {isRecurring && (
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map((label, i) => {
                  const val = DAY_VALUES[i]
                  const active = selectedDays.includes(val)
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => toggleDay(val)}
                      className={cn(
                        'h-8 w-10 rounded-md text-xs font-medium transition-colors border',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || isPending}
              className="flex-1"
            >
              {isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Add task'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
