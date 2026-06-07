'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { BookOpen, Disc3, TrendingUp, Plus, Clock, User2, Sparkles, LogOut, BarChart2, Film, Heart, CheckSquare } from 'lucide-react'
import { logoutAllAction } from '@/app/actions/auth'

type NavItem = {
  label: string
  icon: React.ElementType
  href: string
  match: (p: string) => boolean
  action?: { href: string; label: string }
  subLinks?: { href: string; label: string; icon: React.ElementType }[]
}

const apps: NavItem[] = [
  {
    label: 'Todos',
    icon: CheckSquare,
    href: '/todos',
    match: (p: string) => p.startsWith('/todos'),
  },
  {
    label: 'Journal',
    icon: BookOpen,
    href: '/journal',
    match: (p: string) => p.startsWith('/journal'),
    action: { href: '/journal/new', label: 'New entry' },
    subLinks: [
      { href: '/journal/summary', label: 'Summary', icon: Sparkles },
      { href: '/journal/trends', label: 'Trends', icon: BarChart2 },
    ],
  },
  {
    label: 'Stocks',
    icon: TrendingUp,
    href: '/stocks',
    match: (p: string) => p.startsWith('/stocks'),
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
    ],
  },
  {
    label: 'Movies',
    icon: Film,
    href: '/movies',
    match: (p: string) => p.startsWith('/movies'),
    action: { href: '/movies/recommend', label: 'New picks' },
    subLinks: [
      { href: '/movies/history', label: 'History', icon: Clock },
      { href: '/movies/profile', label: 'Profile', icon: User2 },
    ],
  },
  {
    label: 'P & R Movies',
    icon: Heart,
    href: '/couple',
    match: (p: string) => p.startsWith('/couple'),
    action: { href: '/couple/recommend', label: 'New picks' },
    subLinks: [
      { href: '/couple/profile', label: 'Profile', icon: User2 },
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
                  {action && (
                    <Link
                      href={action.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                      {action.label}
                    </Link>
                  )}
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
      <div className="px-3 py-4 border-t">
        <form action={logoutAllAction}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors w-full"
          >
            <LogOut className="h-3 w-3" />
            Sign out all devices
          </button>
        </form>
      </div>
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
