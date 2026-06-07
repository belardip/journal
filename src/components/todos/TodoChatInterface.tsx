'use client'

import { useState, useEffect, useRef } from 'react'
import { SendHorizonal, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'

type Message = { role: string; content: string }

interface Props {
  initialMessages: Message[]
}

export function TodoChatInterface({ initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [userInput, setUserInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const triggered = useRef(false)

  useEffect(() => {
    if (messages.length === 0 && !triggered.current) {
      triggered.current = true
      sendRaw("Hey, I've got some free time. What should I work on?")
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  async function sendRaw(message: string) {
    setIsStreaming(true)
    setStreamingText('')

    try {
      const res = await fetch('/api/todos/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, clientTime: new Date().toISOString() }),
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

  async function clearChat() {
    await fetch('/api/todos/chat', { method: 'DELETE' })
    setMessages([])
    triggered.current = false
    sendRaw("Hey, I've got some free time. What should I work on?")
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      <div className="flex items-center px-5 py-3 border-b shrink-0">
        <span className="text-sm font-medium text-muted-foreground">AI Assistant</span>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={clearChat}
          title="Start fresh"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 px-4 py-5 space-y-3 overflow-y-auto min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%] ${
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
            <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]">
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

      <div className="border-t p-4 shrink-0">
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
            disabled={isStreaming}
            rows={2}
            placeholder="Reply..."
            className="flex-1 resize-none text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={isStreaming || !userInput.trim()}
            size="icon"
            className="self-end shrink-0"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </Card>
  )
}
