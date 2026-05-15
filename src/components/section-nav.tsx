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
      { href: '/journal/summary', label: 'Summary' },
      { href: '/journal/trends', label: 'Trends' },
    ],
  },
  {
    match: (p: string) => p.startsWith('/albums'),
    links: [
      { href: '/albums', label: 'Picks', exact: true },
      { href: '/albums/recommend', label: 'New picks' },
      { href: '/albums/history', label: 'History' },
      { href: '/albums/profile', label: 'Profile' },
    ],
  },
]

export function SectionNav() {
  const pathname = usePathname()
  const section = sections.find(s => s.match(pathname))
  if (!section) return null

  return (
    <div className="border-b mb-6 -mx-4 md:-mx-6">
      <nav className="flex gap-1 overflow-x-auto scrollbar-none px-4 md:px-6">
        {section.links.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-2 text-sm border-b-2 translate-y-px transition-colors whitespace-nowrap shrink-0',
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
    </div>
  )
}
