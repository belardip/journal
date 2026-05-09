import { Sidebar } from '@/components/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex">
      <Sidebar />
      <main className="flex-1 min-w-0 px-6 py-6 max-w-4xl">
        {children}
      </main>
    </div>
  )
}
