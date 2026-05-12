import { Sidebar } from '@/components/sidebar'
import { SectionNav } from '@/components/section-nav'
import { MobileHeader } from '@/components/mobile-header'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex flex-col md:flex-row">
      <MobileHeader />
      <Sidebar />
      <main className="flex-1 min-w-0 px-4 md:px-6 pt-4 pb-8 max-w-4xl">
        <SectionNav />
        {children}
      </main>
    </div>
  )
}
