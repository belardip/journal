'use client'

import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StreamingChat } from '@/components/streaming-chat'

type Message = { role: string; content: string }

interface Props {
  initialMessages: Message[]
}

export function TodoChatInterface({ initialMessages }: Props) {
  async function handleClear(clearMessages: () => void) {
    await fetch('/api/todos/chat', { method: 'DELETE' })
    clearMessages()
  }

  return (
    <StreamingChat
      apiUrl="/api/todos/chat"
      initialMessages={initialMessages}
      headerTitle="AI Assistant"
      headerActions={({ isStreaming, clearMessages }) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => handleClear(clearMessages)}
          disabled={isStreaming}
          title="Start fresh"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
      placeholder="Reply..."
    />
  )
}
