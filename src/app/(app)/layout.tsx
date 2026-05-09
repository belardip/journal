import { Sidebar } from '@/components/sidebar'
import { SectionNav } from '@/components/section-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 pt-4 pb-8 max-w-4xl">
        <SectionNav />
        {children}
      </main>
    </div>
  )
}
