'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, ChevronRight, Plus } from 'lucide-react'

const navLinks = [
  { href: '/journal', label: 'Entries' },
  { href: '/profile', label: 'Profile' },
]

export function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname.startsWith('/login')) return null

  return (
    <header className="border-b bg-card shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="flex items-center justify-between h-14">
          <Link href="/journal" className="font-semibold text-lg text-primary tracking-tight">
            Journal
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  pathname === href || (href === '/journal' && pathname.startsWith('/journal'))
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {label}
              </Link>
            ))}
            <Link href="/journal/new">
              <Button size="sm" className="ml-2">
                <Plus className="h-4 w-4 mr-1" />New Entry
              </Button>
            </Link>
          </nav>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="sm:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">Journal</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center justify-between',
                      pathname.startsWith(href)
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    {label}
                    <ChevronRight className="h-4 w-4 opacity-50" />
                  </Link>
                ))}
                <Link href="/journal/new" onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-md text-sm font-medium text-foreground hover:bg-muted flex items-center gap-2">
                  <Plus className="h-4 w-4" />New Entry
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
