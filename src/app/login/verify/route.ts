import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getSessionToken } from '@/lib/session'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const base = process.env.APP_URL ?? 'http://localhost:3000'

  if (!token || !verifyToken(token)) {
    return NextResponse.redirect(`${base}/login?error=expired`)
  }

  const sessionToken = await getSessionToken()
  const jar = await cookies()
  jar.set('www_auth', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return NextResponse.redirect(`${base}/journal`)
}
