import type { NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'

// Edge-safe config — used by proxy.ts. Full config (signIn restriction) lives in auth.ts.
export const authConfig = {
  trustHost: true, // self-hosted behind nginx, not on Vercel — Host header isn't auto-trusted
  providers: [Google],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth: session, request: { nextUrl } }) {
      if (process.env.NODE_ENV === 'development') return true

      const isLoggedIn = !!session?.user
      const { pathname } = nextUrl

      const isPublic =
        pathname.startsWith('/api/auth') ||
        pathname === '/login' ||
        pathname === '/robots.txt'

      if (isPublic) return true
      return isLoggedIn
    },
  },
} satisfies NextAuthConfig
