'use server'

import { Resend } from 'resend'
import { generateToken } from '@/lib/auth'

export async function sendMagicLinkAction() {
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (!allowedEmail) throw new Error('ALLOWED_EMAIL not set')

  const token = generateToken()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const link = `${baseUrl}/login/verify?token=${token}`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: allowedEmail,
    subject: 'Your journal login link',
    html: `
      <p>Click the link below to sign in. It expires in 15 minutes.</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  })

  if (error) {
    console.error('Resend error:', error)
    return { error: 'Failed to send email. Try again.' }
  }

  return { success: true }
}
