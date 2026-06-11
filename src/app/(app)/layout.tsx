import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionToken } from '@/lib/session'
import { Sidebar } from '@/components/sidebar'
import { SectionNav } from '@/components/section-nav'
import { MobileHeader } from '@/components/mobile-header'
import { BottomNav } from '@/components/bottom-nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'development') {
    const jar = await cookies()
    const cookieValue = jar.get('www_auth')?.value
    const currentToken = await getSessionToken()
    if (cookieValue !== currentToken) redirect('/login')
  }

  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 md:px-6 pt-4 pb-20 md:pb-8 max-w-4xl">
        <SectionNav />
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
