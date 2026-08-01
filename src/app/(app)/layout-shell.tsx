'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { SectionNav } from '@/components/section-nav'
import { MobileHeader } from '@/components/mobile-header'
import { BottomNav } from '@/components/bottom-nav'

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isFullWidth = pathname.startsWith('/stocks')

  if (isFullWidth) {
    return (
      <div className="flex flex-col md:flex-row h-dvh overflow-hidden">
        <MobileHeader />
        <Sidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
        <BottomNav />
      </div>
    )
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
