'use client'

import { useState, useEffect, useRef } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import ReactMarkdown from 'react-markdown'

type Message = { role: 'user' | 'assistant'; content: string }

export function StocksChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

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

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b shrink-0">
        <span className="text-sm font-medium text-muted-foreground">Portfolio Advisor</span>
      </div>

      <div className="flex-1 px-6 py-5 space-y-4 overflow-y-auto min-h-0">
        {messages.length === 0 && !isStreaming && (
          <p className="text-sm text-muted-foreground text-center pt-12">
            Ask me anything about your portfolio — what to buy, sell, rebalance, or how to think about a position.
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[75%] ${
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
            <div className="bg-muted rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[75%] prose prose-sm dark:prose-invert">
              <ReactMarkdown>{streamingText}</ReactMarkdown>
            </div>
          </div>
        )}

        {isStreaming && !streamingText && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-4 py-3">
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

      <div className="border-t px-6 py-4 shrink-0">
        <div className="flex gap-3 items-end">
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
            placeholder="Ask about your portfolio…"
            className="flex-1 resize-none text-sm"
          />
          <Button
            onClick={send}
            disabled={isStreaming || !input.trim()}
            size="icon"
            className="self-end shrink-0"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
