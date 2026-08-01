import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionToken } from '@/lib/session'
import { LayoutShell } from './layout-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    const jar = await cookies()
    const cookieValue = jar.get('www_auth')?.value
    const currentToken = await getSessionToken()
    if (cookieValue !== currentToken) redirect('/login')
  }

  return <LayoutShell>{children}</LayoutShell>
}
