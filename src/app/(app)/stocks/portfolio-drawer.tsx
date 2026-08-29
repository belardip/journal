'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { SendHorizonal, Sparkles, MessagesSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ReactMarkdown from 'react-markdown'
import { getPortfolioNewsAction, addPortfolioNoteAction, overwritePortfolioNoteAction } from '@/app/actions/stocks'
import type { HoldingRow } from './holdings-chart'

type Message = { role: 'user' | 'assistant'; content: string }
type Tab = 'chat' | 'news'
type Note = { summary: string; lastUpdatedAt: Date | null } | null

function MemoryNote({ note }: { note: Note }) {
  const [summary, setSummary] = useState(note?.summary ?? '')

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(summary)
  const [savingEdit, startEditTransition] = useTransition()

  const [addingNote, setAddingNote] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [addingPending, startAddTransition] = useTransition()

  function saveEdit() {
    const trimmed = editValue.trim()
    startEditTransition(async () => {
      await overwritePortfolioNoteAction(trimmed)
      setSummary(trimmed)
      setEditing(false)
    })
  }

  function submitNote() {
    const text = noteInput.trim()
    if (!text) return
    startAddTransition(async () => {
      const result = await addPortfolioNoteAction(text)
      setSummary(result.summary)
      setNoteInput('')
      setAddingNote(false)
    })
  }

  return (
    <div className="px-5 pt-4 shrink-0 space-y-2">
      {summary && !editing && (
        <div className="rounded-lg border bg-muted/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Advisor memory</span>
            <button
              onClick={() => { setEditValue(summary); setEditing(true) }}
              title="Directly rewrite the memory text (no merging)"
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed">{summary}</p>
        </div>
      )}

      {editing && (
        <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rewrite memory directly</span>
          <Textarea
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            rows={5}
            className="text-[13px] resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setEditing(false)} disabled={savingEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!editing && (
        addingNote ? (
          <div className="space-y-2">
            <Textarea
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              rows={2}
              placeholder="e.g. SDLP and ENW are moonshots I'm holding long term"
              className="text-[13px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7" onClick={submitNote} disabled={addingPending || !noteInput.trim()}>
                {addingPending ? 'Adding...' : 'Add'}
              </Button>
              <Button size="sm" variant="ghost" className="h-7" onClick={() => { setAddingNote(false); setNoteInput('') }} disabled={addingPending}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingNote(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add a note
          </button>
        )
      )}
    </div>
  )
}

export function PortfolioDrawer({ holdings, note }: { holdings: HoldingRow[]; note: Note }) {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('chat')

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const [newsResult, setNewsResult] = useState<string | null>(null)
  const [newsPending, startNewsTransition] = useTransition()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function send() {
    const msg = input.trim()
    if (!msg || isStreaming) return

    const history = messages
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setIsStreaming(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/chat/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, messages: history }),
      })

      if (!res.body) { setIsStreaming(false); return }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: boolean }
            if (data.chunk) {
              fullText += data.chunk
              setStreamingText(fullText)
            } else if (data.done) {
              setMessages(prev => [...prev, { role: 'assistant', content: fullText }])
              setStreamingText('')
              setIsStreaming(false)
            } else if (data.error) {
              setMessages(prev => [...prev, { role: 'assistant', content: '[Something went wrong. Please try again.]' }])
              setStreamingText('')
              setIsStreaming(false)
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch {
      setIsStreaming(false)
      setStreamingText('')
    }
  }

  function loadNews() {
    startNewsTransition(async () => {
      const text = await getPortfolioNewsAction(
        holdings.map(h => ({ ticker: h.ticker, name: h.name, price: h.price }))
      )
      setNewsResult(text)
    })
  }

  function openChat() {
    setTab('chat')
    setIsOpen(true)
  }

  function openNews() {
    setTab('news')
    setIsOpen(true)
    if (!newsResult && !newsPending) loadNews()
  }

  const chatMessages = (
    <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto min-h-0">
      {messages.length === 0 && !isStreaming && (
        <p className="text-[13px] text-muted-foreground leading-relaxed pt-3">
          Ask about your holdings — what to buy, sell, or rebalance.
        </p>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed max-w-[88%] ${
            msg.role === 'user'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground prose prose-sm dark:prose-invert'
          }`}>
            {msg.role === 'assistant' ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
          </div>
        </div>
      ))}

      {streamingText && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed max-w-[88%] prose prose-sm dark:prose-invert">
            <ReactMarkdown>{streamingText}</ReactMarkdown>
          </div>
        </div>
      )}

      {isStreaming && !streamingText && (
        <div className="flex justify-start">
          <div className="bg-muted rounded-2xl px-4 py-2.5">
            <span className="inline-flex gap-1 text-muted-foreground">
              <span className="animate-bounce text-base leading-none">·</span>
              <span className="animate-bounce text-base leading-none [animation-delay:0.15s]">·</span>
              <span className="animate-bounce text-base leading-none [animation-delay:0.3s]">·</span>
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )

  const chatInput = (
    <div className="border-t px-5 py-4 shrink-0">
      <div className="flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          disabled={isStreaming}
          rows={2}
          placeholder="Ask a question…"
          className="flex-1 resize-none text-[13px]"
        />
        <Button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          size="icon"
          className="self-end shrink-0 h-8 w-8 rounded-[9px]"
        >
          <SendHorizonal className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
    </div>
  )

  const newsPanel = (
    <div className="flex-1 px-5 py-5 overflow-y-auto min-h-0">
      {newsPending ? (
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <span className="inline-flex gap-1">
            <span className="animate-bounce text-base leading-none">·</span>
            <span className="animate-bounce text-base leading-none [animation-delay:0.15s]">·</span>
            <span className="animate-bounce text-base leading-none [animation-delay:0.3s]">·</span>
          </span>
          Looking up news…
        </div>
      ) : newsResult ? (
        <>
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            <ReactMarkdown>{newsResult}</ReactMarkdown>
          </div>
          <button
            onClick={() => { setNewsResult(null); loadNews() }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-4"
          >
            Refresh
          </button>
        </>
      ) : (
        <p className="text-[13px] text-muted-foreground leading-relaxed pt-3">
          No news to show.
        </p>
      )}
    </div>
  )

  return (
    <>
      <Button variant="outline" size="sm" onClick={openNews} disabled={holdings.length === 0}>
        <Sparkles className="h-3.5 w-3.5" />
        What&apos;s moving
      </Button>
      <Button variant="outline" size="sm" onClick={openChat}>
        <MessagesSquare className="h-3.5 w-3.5" />
        Advisor
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="p-0 gap-0 flex flex-col data-[side=right]:w-full data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none"
        >
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle>{tab === 'chat' ? 'Portfolio Advisor' : "What's Moving"}</SheetTitle>
          </SheetHeader>
          {tab === 'chat' ? (
            <>
              <MemoryNote note={note} />
              {chatMessages}
              {chatInput}
            </>
          ) : (
            newsPanel
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
