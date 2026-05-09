'use client'

import { useState, useTransition } from 'react'
import { sendMagicLinkAction } from '@/app/actions/auth'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const expired = searchParams.get('error') === 'expired'

  function handleSend() {
    setError('')
    startTransition(async () => {
      const result = await sendMagicLinkAction()
      if (result?.error) setError(result.error)
      else setSent(true)
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-xs space-y-3">
        {expired && !sent && (
          <p className="text-sm text-destructive text-center">That link expired. Send a new one.</p>
        )}
        {sent ? (
          <p className="text-sm text-muted-foreground text-center">Check your email — link expires in 15 minutes.</p>
        ) : (
          <>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <button
              onClick={handleSend}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Send me a login link'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
