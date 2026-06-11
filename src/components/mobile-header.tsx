'use client'

import { logoutAllAction } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'

export function MobileHeader() {
  return (
    <header className="md:hidden flex items-center justify-between h-14 px-4 border-b bg-card sticky top-0 z-40">
      <span className="font-semibold text-sm tracking-tight text-primary">tenderbones</span>
      <form action={logoutAllAction}>
        <button
          type="submit"
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </form>
    </header>
  )
}
