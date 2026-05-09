# Journal — Claude Instructions

**URL**: https://www.tenderbones.org  
**Auth**: Magic link — click "Send me a login link", check email, click link

## Stack
Next.js 16 (App Router), TypeScript, Prisma 7 + LibSQL/SQLite, shadcn/ui, Tailwind v4, Anthropic SDK, Resend (email)

## Production Server
- **App location**: `/var/www/journal`
- **Database**: `/var/www/journal/prod.db` (SQLite)
- **PM2 process**: `journal` on port 3002 — `pm2 restart journal`
- **Logs**: `pm2 logs journal`
- **Nginx config**: `/etc/nginx/sites-enabled/journal-tenderbones`

## Deploying

```bash
bash deploy.sh "commit message"
```

Commits, pushes to git, pulls on server, **builds on server**, restarts PM2.

### ⚠️ Do NOT build locally and upload `.next/`

Next.js 16 uses Turbopack for production builds. Turbopack hashes module IDs using **absolute file paths** — Windows builds produce different hashes than Linux. Build on server only.

### After schema changes

SSH in and run manually before deploying:

```bash
DATABASE_URL='file:/var/www/journal/prod.db' npx prisma db push
DATABASE_URL='file:/var/www/journal/prod.db' npx prisma generate
```

## Auth

Magic link flow:
1. `/login` — user clicks "Send me a login link"
2. Server generates HMAC-signed token (15-min TTL), sends email via Resend
3. `/login/verify?token=xxx` — verifies token, sets `www_auth=authenticated` cookie (30 days)
4. Middleware checks `www_auth` cookie on all routes except `/login`

Cookie isolation: `www_auth` cookie has no `domain` attribute, so it's scoped to `www.tenderbones.org` only — cannot access `cottage.tenderbones.org`.

### Required env vars on server

```
DATABASE_URL=file:/var/www/journal/prod.db
ANTHROPIC_API_KEY=...
MAGIC_LINK_SECRET=...  # openssl rand -base64 32
RESEND_API_KEY=re_...  # from resend.com
ALLOWED_EMAIL=belardip@gmail.com
NEXT_PUBLIC_BASE_URL=https://www.tenderbones.org
```

### Resend setup

- Account at resend.com (free: 100 emails/day, 3000/month)
- Add domain `tenderbones.org` → add the DNS TXT + MX records it gives you
- Once verified, emails send from `noreply@tenderbones.org`
- API key goes in `.env.local` on server as `RESEND_API_KEY`

**Do not use `redirect()` in server actions called from `useTransition`** — return `{ success: true }` and navigate on the client instead.

## Prisma 7 — Critical
Always use the adapter. Never `new PrismaClient()` without it. See `src/lib/db.ts`.
