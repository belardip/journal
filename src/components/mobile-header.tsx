'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { SidebarNav } from '@/components/sidebar'

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden flex items-center h-14 px-4 border-b bg-card sticky top-0 z-40">
      <button
        onClick={() => setOpen(true)}
        className="p-1 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="ml-3 font-semibold text-sm tracking-tight text-primary">tenderbones</span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 gap-0 flex flex-col" showCloseButton={false}>
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  )
}
