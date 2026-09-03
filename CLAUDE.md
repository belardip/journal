# Journal

**URL**: https://www.tenderbones.org
**Auth**: Google OAuth (Auth.js/next-auth v5), single allowed account
**Users**: Personal — belardip@gmail.com only

## Production
- **Location**: `/var/www/journal` — port 3002
- **Database**: `/var/www/journal/prod.db`
- **Deploy**: `bash deploy.sh "message"`

## Auth
Google sign-in via `next-auth` v5, modeled on paintnext's setup (`paintnext/src/auth.ts`/`auth.config.ts`).
- `src/auth.config.ts` — edge-safe config (Google provider, `authorized()` route-gate callback), used by `src/proxy.ts`
- `src/auth.ts` — full config; `signIn` callback only allows `profile.email === process.env.ALLOWED_EMAIL` (no DB — journal is single-user, no `User` model)
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- Auth guard: `src/proxy.ts` — must be named `proxy`, not `middleware` (Next.js 16+ convention)
- Login page: `src/app/login/page.tsx` — `signIn('google', { redirectTo: '/journal' })`
- Logout: `src/app/actions/auth.ts` → `logoutAction()` — `signOut({ redirectTo: '/login' })`, used by `sidebar.tsx` and `mobile-header.tsx`
- API routes that stream (`api/chat/[id]`, `api/chat/stocks`, `api/todos/chat`) re-check `auth()` directly since `proxy.ts` only gates page navigation-level requests loosely — see those files for the pattern
- Env vars: `AUTH_URL` (prod only — see gotcha below), `AUTH_SECRET` (unique per environment), `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (shared "tenderbones" OAuth client — same credentials as `dashboard`'s Google Photos integration; see `.api-keys`), `ALLOWED_EMAIL`
- Dev bypass: `NODE_ENV === 'development'` skips auth entirely (see `auth.config.ts` and the API routes above)

**Gotcha — `AUTH_URL` required in production**: `auth.config.ts` sets `trustHost: true` (needed or every request throws `UntrustedHost` behind nginx). That alone isn't enough — Auth.js's header-based host detection (`x-forwarded-host`/`host`) doesn't reliably resolve the real domain on this Turbopack/`next start` setup even though nginx forwards `Host` correctly; it silently falls back to `localhost:<port>`, breaking every generated OAuth URL. Fix: set `AUTH_URL=https://www.tenderbones.org` explicitly in prod's `.env.local` (not needed in dev — no reverse proxy there). If a future subdomain app copies this auth pattern, set its own `AUTH_URL` too.

## AI Journal Companion
- System prompt: `src/lib/chat.ts` → `buildChatSystemPrompt()`
- User profile (themes, mood trends, patterns) built from past entries, injected into prompt
- Claude API call: `src/app/api/chat/[id]/route.ts`
- Tune behavior by editing the prompt in `src/lib/chat.ts` directly

## Shared Components
Check `src/components/` before building new UI:

| Component | File | Description |
|-----------|------|-------------|
| `StreamingChat` | `src/components/streaming-chat.tsx` | Streaming SSE chat UI — used by journal and todos |
| `RatingButtons` | `src/components/rating-buttons.tsx` | 10-star rating with notes |
| `RecommendationForm` | `src/components/recommendation-form.tsx` | Mood-chip + textarea for AI recommendation flows |

## Required Env Vars
```
DATABASE_URL=file:/var/www/journal/prod.db
ANTHROPIC_API_KEY=...
AUTH_SECRET=...
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
ALLOWED_EMAIL=belardip@gmail.com
NEXT_PUBLIC_BASE_URL=https://www.tenderbones.org
```

See root `CLAUDE.md` for shared Next.js stack conventions.
