'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, Disc3, Plus, Clock, User2, ScrollText, Sparkles } from 'lucide-react'

type NavItem = {
  label: string
  icon: React.ElementType
  href: string
  match: (p: string) => boolean
  action: { href: string; label: string }
  subLinks?: { href: string; label: string; icon: React.ElementType }[]
}

const apps: NavItem[] = [
  {
    label: 'Journal',
    icon: BookOpen,
    href: '/journal',
    match: (p: string) => p.startsWith('/journal'),
    action: { href: '/journal/new', label: 'New entry' },
    subLinks: [
      { href: '/journal/summary', label: 'Summary', icon: Sparkles },
    ],
  },
  {
    label: 'Albums',
    icon: Disc3,
    href: '/albums',
    match: (p: string) => p.startsWith('/albums'),
    action: { href: '/albums/recommend', label: 'New picks' },
    subLinks: [
      { href: '/albums/history', label: 'History', icon: Clock },
      { href: '/albums/profile', label: 'Profile', icon: User2 },
      { href: '/albums/logs', label: 'Logs', icon: ScrollText },
    ],
  },
]

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      <div className="px-4 py-5 border-b">
        <span className="font-semibold text-sm tracking-tight text-primary">tenderbones</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {apps.map(({ label, icon: Icon, href, match, action, subLinks }) => {
          const active = match(pathname)
          return (
            <div key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
              {active && (
                <div className="mt-0.5 ml-2 space-y-0.5">
                  <Link
                    href={action.href}
                    onClick={onNavigate}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {action.label}
                  </Link>
                  {subLinks?.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
                        pathname.startsWith(sub.href)
                          ? 'text-foreground bg-muted'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <sub.icon className="h-3 w-3" />
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-52 shrink-0 border-r bg-card flex-col min-h-screen sticky top-0 h-screen">
      <SidebarNav />
    </aside>
  )
}
