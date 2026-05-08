# Next Starter — Claude Instructions

## Stack
- **Next.js 16** (App Router, Server Components, Server Actions)
- **shadcn/ui** with Radix/Nova preset — always use shadcn components
- **Tailwind CSS v4** (`@import "tailwindcss"` syntax, no `tailwind.config.ts`)
- **Prisma 7** + `@prisma/adapter-libsql` for SQLite
- **Anthropic SDK** (`@anthropic-ai/sdk`) for AI features

---

## ALWAYS Use shadcn Components

Never write raw HTML form elements. Every common UI primitive has a shadcn component installed in `src/components/ui/`. Use them:

| Need | Component | Import |
|------|-----------|--------|
| Text input | `<Input>` | `@/components/ui/input` |
| Multiline input | `<Textarea>` | `@/components/ui/textarea` |
| Button | `<Button>` | `@/components/ui/button` |
| Dropdown select | `<Select>` | `@/components/ui/select` |
| Checkbox | `<Checkbox>` | `@/components/ui/checkbox` |
| Form label | `<Label>` | `@/components/ui/label` |
| Card container | `<Card>` | `@/components/ui/card` |
| Pill/tag | `<Badge>` | `@/components/ui/badge` |
| Modal | `<Dialog>` | `@/components/ui/dialog` |
| Date picker | `<Calendar>` + `<Popover>` | `@/components/ui/calendar` + popover |
| Hover menu | `<DropdownMenu>` | `@/components/ui/dropdown-menu` |
| Mobile drawer | `<Sheet>` | `@/components/ui/sheet` |
| Divider | `<Separator>` | `@/components/ui/separator` |
| Tabs | `<Tabs>` | `@/components/ui/tabs` |
| Toast | `toast()` from `sonner` | already wired in layout |

If you need a component not yet installed: `npx shadcn@latest add <name> --yes`

---

## Prisma 7 — Critical Breaking Changes

Prisma 7 removed the built-in database engine. You MUST use a driver adapter. The setup in `src/lib/db.ts` is correct — do not change `new PrismaClient({ adapter })` to `new PrismaClient()` or `new PrismaClient({ datasourceUrl })`, both will throw.

```ts
// CORRECT
import { PrismaLibSql } from '@prisma/adapter-libsql'
const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! })
export const db = new PrismaClient({ adapter })

// WRONG — will throw at runtime
export const db = new PrismaClient()
export const db = new PrismaClient({ datasourceUrl: '...' })
```

Same applies in seed scripts — import `PrismaLibSql` and pass the adapter.

---

## Tailwind CSS v4

No `tailwind.config.ts`. Theme is defined in `src/app/globals.css` using `@theme inline` with CSS variables. To add custom colors or tokens, edit the `@theme inline` block in globals.css — do not create a tailwind config file.

---

## Server Actions Pattern

All database mutations are Server Actions in `src/app/actions/`. Pattern:

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export async function myAction(data: string) {
  await db.myModel.create({ data: { field: data } })
  revalidatePath('/my-page')
}
```

Call them from Client Components inside `startTransition` for non-blocking UI.

---

## File Conventions

- Server components: no directive (default)
- Client components: `'use client'` at top
- Server actions: `'use server'` at top, live in `src/app/actions/`
- Shared types: define inline or in `src/lib/types.ts`
- `async params` in dynamic routes: `const { id } = await params` (Next.js 16)

---

## Environment Variables

- `.env` — Prisma CLI only (`DATABASE_URL` for `prisma db push`)
- `.env.local` — runtime secrets (`DATABASE_URL`, `ANTHROPIC_API_KEY`)

Both files are gitignored. Copy `.env.example` and `.env.local.example` to get started.
