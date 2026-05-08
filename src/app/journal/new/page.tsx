'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { CalendarIcon, ArrowRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createEntryAction } from '@/app/actions/entries'

const timeOptions = [
  { value: 'morning', icon: '🌅', label: 'Morning' },
  { value: 'afternoon', icon: '☀️', label: 'Afternoon' },
  { value: 'evening', icon: '🌆', label: 'Evening' },
  { value: 'night', icon: '🌙', label: 'Night' },
]

export default function NewEntryPage() {
  const [date, setDate] = useState<Date>(new Date())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [timeOfDay, setTimeOfDay] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    const dateStr = format(date, 'yyyy-MM-dd')
    const result = await createEntryAction(dateStr, timeOfDay || null, content.trim())
    router.push(`/journal/${result.id}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">New Entry</h1>

      <form onSubmit={handleSubmit}>
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-48">
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'MMMM d, yyyy') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={d => { if (d) { setDate(d); setCalendarOpen(false) } }}
                  disabled={d => d > new Date()}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Time of Day</Label>
            <div className="flex gap-1.5">
              {timeOptions.map(opt => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={timeOfDay === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTimeOfDay(prev => prev === opt.value ? '' : opt.value)}
                  className="gap-1.5"
                >
                  {opt.icon}
                  <span className="hidden sm:inline">{opt.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={16}
            autoFocus
            required
            placeholder="Write freely. This is just for you..."
            className="w-full resize-none text-base min-h-80"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting || !content.trim()}>
            {submitting ? 'Starting...' : 'Start Conversation'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
