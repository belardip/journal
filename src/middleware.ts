import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV === 'development') return NextResponse.next()
  const auth = request.cookies.get('www_auth')?.value
  if (auth === 'authenticated') return NextResponse.next()
  return NextResponse.redirect(new URL('/login', request.url))
}

export const config = {
  matcher: ['/((?!login|logout|_next/static|_next/image|favicon.ico).*)'],
}
