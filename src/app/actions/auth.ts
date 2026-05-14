'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { generateToken } from '@/lib/auth'
import { rotateSessionToken } from '@/lib/session'

export async function sendMagicLinkAction() {
  const allowedEmail = process.env.ALLOWED_EMAIL
  if (!allowedEmail) throw new Error('ALLOWED_EMAIL not set')

  const token = generateToken()
  const baseUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const link = `${baseUrl}/login/verify?token=${token}`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({
    from: 'noreply@tenderbones.org',
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

export async function logoutAllAction() {
  await rotateSessionToken()
  const jar = await cookies()
  jar.delete('www_auth')
  redirect('/login')
}
