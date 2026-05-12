'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const sections = [
  {
    match: (p: string) => p.startsWith('/journal'),
    links: [
      { href: '/journal', label: 'Entries', exact: true },
      { href: '/journal/new', label: 'New entry' },
    ],
  },
  {
    match: (p: string) => p.startsWith('/albums'),
    links: [
      { href: '/albums', label: 'Picks', exact: true },
      { href: '/albums/recommend', label: 'New picks' },
      { href: '/albums/history', label: 'History' },
      { href: '/albums/profile', label: 'Profile' },
      { href: '/albums/logs', label: 'Logs' },
    ],
  },
]

export function SectionNav() {
  const pathname = usePathname()
  const section = sections.find(s => s.match(pathname))
  if (!section) return null

  return (
    <nav className="flex gap-1 border-b mb-6 -mx-4 px-4 md:-mx-6 md:px-6 overflow-x-auto">
      {section.links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
              active
                ? 'border-foreground font-medium text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
