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
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-5xl mb-4">📖</div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-muted-foreground text-sm">Personal journal with AI companion.</p>
        </div>

        {expired && !sent && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive text-center">
            That link has expired. Send a new one below.
          </div>
        )}

        {sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-800 text-center space-y-1">
            <p className="font-medium">Check your email</p>
            <p className="text-green-700">A login link was sent to your inbox. It expires in 15 minutes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <button
              onClick={handleSend}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Send me a login link'}
            </button>
          </div>
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
