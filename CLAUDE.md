# Journal

**URL**: https://www.tenderbones.org
**Auth**: Magic link (email)
**Users**: Personal — belardip@gmail.com only

## Production
- **Location**: `/var/www/journal` — port 3002
- **Database**: `/var/www/journal/prod.db`
- **Deploy**: `bash deploy.sh "message"`

## Auth
Magic link flow: `/login` → HMAC-signed token emailed via Resend → `/login/verify?token=...` → sets `www_auth` cookie (30 days).
- Token TTL: 15 minutes (`TOKEN_TTL_MS` in `src/lib/auth.ts`)
- Allowed email: `ALLOWED_EMAIL` in `.env.local`
- Cookie scoped to `www.tenderbones.org` only (no `domain` attribute)
- Auth guard: `src/proxy.ts` — must be named `proxy`, not `middleware`

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
MAGIC_LINK_SECRET=...
RESEND_API_KEY=re_...
ALLOWED_EMAIL=belardip@gmail.com
NEXT_PUBLIC_BASE_URL=https://www.tenderbones.org
```

See root `CLAUDE.md` for shared Next.js stack conventions.
