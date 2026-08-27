'use client'

import { useState, useEffect, useRef } from 'react'
import { SendHorizonal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import ReactMarkdown from 'react-markdown'

type Message = { role: 'user' | 'assistant'; content: string }

export function StocksChat() {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 md:bottom-4 right-4 z-40 bg-primary text-primary-foreground rounded-full px-4 py-2 text-[13px] font-semibold shadow-lg"
      >
        Advisor
      </button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="p-0 gap-0 flex flex-col data-[side=right]:w-full data-[side=right]:sm:w-1/2 data-[side=right]:sm:max-w-none"
        >
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle>Portfolio Advisor</SheetTitle>
          </SheetHeader>
          {chatMessages}
          {chatInput}
        </SheetContent>
      </Sheet>
    </>
  )
}
