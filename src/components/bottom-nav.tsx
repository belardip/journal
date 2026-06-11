'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, Disc3, TrendingUp, Film, Heart, CheckSquare } from 'lucide-react'

const tabs = [
  { href: '/todos', label: 'Todos', icon: CheckSquare, match: (p: string) => p.startsWith('/todos') },
  { href: '/journal', label: 'Journal', icon: BookOpen, match: (p: string) => p.startsWith('/journal') },
  { href: '/stocks', label: 'Stocks', icon: TrendingUp, match: (p: string) => p.startsWith('/stocks') },
  { href: '/albums', label: 'Albums', icon: Disc3, match: (p: string) => p.startsWith('/albums') },
  { href: '/movies', label: 'Movies', icon: Film, match: (p: string) => p.startsWith('/movies') },
  { href: '/couple', label: 'P & R', icon: Heart, match: (p: string) => p.startsWith('/couple') },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-sm border-t">
      <div className="flex items-center justify-around px-1 h-16">
        {tabs.map(({ href, label, icon: Icon, match }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-2 flex-1 rounded-xl transition-colors',
              match(pathname) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[9px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
