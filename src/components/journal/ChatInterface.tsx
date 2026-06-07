'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StreamingChat } from '@/components/streaming-chat'
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

export function ChatInterface({ entry, messages, entryWhen }: Props) {
  const [sessionComplete, setSessionComplete] = useState(entry.sessionComplete)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleFinalize() {
    startTransition(async () => {
      await finalizeEntryAction(entry.id)
      setSessionComplete(true)
      router.push('/journal')
    })
  }

  return (
    <StreamingChat
      apiUrl={`/api/chat/${entry.id}`}
      initialMessages={messages}
      disabled={sessionComplete}
      autoSendFirst={
        messages.length === 0 && !entry.sessionComplete
          ? `Here is my journal entry (${entryWhen}):\n\n${entry.content}`
          : undefined
      }
      headerTitle="Conversation"
      headerActions={() =>
        sessionComplete ? (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" /> Session saved
          </span>
        ) : null
      }
      footerExtra={({ isStreaming }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={handleFinalize}
          disabled={isPending || isStreaming}
        >
          {isPending ? 'Analyzing...' : 'Save & Close'}
        </Button>
      )}
    />
  )
}
