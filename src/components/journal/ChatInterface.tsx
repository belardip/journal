'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SendHorizonal, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { finalizeEntryAction } from '@/app/actions/entries'

type Message = { role: string; content: string }

interface Props {
  entry: {
    id: number
    date: string
    timeOfDay: string | null
    content: string
    sessionComplete: boolean
  }
  messages: Message[]
  entryWhen: string
}

export function ChatInterface({ entry, messages: initialMessages, entryWhen }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [userInput, setUserInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [sessionComplete, setSessionComplete] = useState(entry.sessionComplete)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const triggered = useRef(false)

  useEffect(() => {
    if (initialMessages.length === 0 && !entry.sessionComplete && !triggered.current) {
      triggered.current = true
      sendRaw(`Here is my journal entry (${entryWhen}):\n\n${entry.content}`)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function sendRaw(message: string) {
    setIsStreaming(true)
    setStreamingText('')

    try {
      const res = await fetch(`/api/chat/${entry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (!res.body) return

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
            const data = JSON.parse(line.slice(6)) as { chunk?: string; done?: boolean; error?: string }
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

  function sendMessage() {
    const msg = userInput.trim()
    if (!msg || isStreaming) return
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setUserInput('')
    sendRaw(msg)
  }

  function handleFinalize() {
    startTransition(async () => {
      await finalizeEntryAction(entry.id)
      router.push('/journal')
    })
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center px-5 py-3 border-b">
        <span className="text-sm font-medium text-muted-foreground">Conversation</span>
        {sessionComplete && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5 ml-auto">
            <CheckCircle className="h-4 w-4" /> Session saved
          </span>
        )}
      </div>

      <div className="px-4 py-5 space-y-3 min-h-48 max-h-[560px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[82%] ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[82%]">
              {streamingText}
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

      {!sessionComplete && (
        <div className="border-t p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              disabled={isStreaming || isPending}
              rows={2}
              placeholder="Reply... (Enter to send, Shift+Enter for newline)"
              className="flex-1 resize-none text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={isStreaming || !userInput.trim() || isPending}
              size="icon"
              className="self-end shrink-0"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for new line</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleFinalize}
              disabled={isPending || isStreaming}
            >
              {isPending ? 'Analyzing...' : 'Save & Close'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
