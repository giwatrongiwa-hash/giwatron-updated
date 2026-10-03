# GIWATRON

A pixel-art robot NFT collection, presented as a retro terminal operating
system. Pages: `/` (boot → robot display → system log → unit database →
whitelist gate → arcade → FAQ) and `/whitelist` (the registration protocol).

Stack: Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Framer Motion,
Upstash Redis (REST) for storage.

## Everyday changes

| What | Where |
|------|-------|
| Add a new NFT | put the image in `public/nft/`, append an entry to `ROBOT_UNITS` in `lib/units.ts` |
| Change the X account / link | `X_HANDLE` and `X_URL` in `lib/site.ts` (every X link on the site uses `X_URL`) |
| FAQ text | `QUERIES` in `components/os/Faq.tsx` |

## Going live — one-time setup

1. **Database.** Vercel → your project → **Storage** → **Upstash for Redis**
   (free tier) → connect it to the project. This adds `KV_REST_API_URL` and
   `KV_REST_API_TOKEN` automatically. Without it the whitelist refuses
   registrations in production (on purpose, so no entries are lost).
2. **Secrets.** Run `node scripts/generate-secrets.mjs` and add
   `GAME_SECRET`, `SESSION_SECRET`, `CRON_SECRET`, `ADMIN_TOKEN_HASH` in
   Vercel → Settings → Environment Variables (Production). Keep the printed
   `ADMIN_TOKEN` private (password manager) — it is not stored anywhere.
   Delete the old `GATE_PASSWORD_HASH` variable if it is still there.
3. **Spend limits.** Vercel → Settings → Billing → Spend Management, and a
   budget in the Upstash console.
4. Deploy: `vercel --prod`.

## Whitelist admin

```bash
# list
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-DOMAIN/api/admin/whitelist
# CSV download
curl -H "Authorization: Bearer $ADMIN_TOKEN" "https://YOUR-DOMAIN/api/admin/whitelist?format=csv" -o whitelist.csv
# hard delete one address (also removed from backups)
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" "https://YOUR-DOMAIN/api/admin/whitelist?wallet=0x..."
```

A daily snapshot is taken automatically (Vercel Cron, `vercel.json`) and
kept for 30 days.

## How the whitelist protocol works

1. Four task buttons (follow @GIWATRON, like / reply / quote the latest post)
   all open https://x.com/Giwatron in a new browser tab. The server records
   when each was opened in a signed httpOnly cookie.
2. VERIFY unlocks 30 seconds after the last task — enforced by the server.
3. The visitor registers an X handle + EVM address. One entry per address,
   per X account and per session.

X's free API cannot confirm that a like/follow actually happened, so this
checks that the tasks were opened, not that they were completed. The
stored X handles let you review entries manually before allocation.

## Local development

```bash
npm install
npm run dev
```

`.env.local` needs `GAME_SECRET` and `SESSION_SECRET` (≥ 32 chars each).
Without the Upstash variables, an in-memory store is used locally.

## Structure

```
app/
  page.tsx, whitelist/page.tsx
  api/quest            protocol state machine (sync / task / verify)
  api/whitelist        registration (requires verified protocol cookie)
  api/game/start|claim arcade anti-cheat
  api/admin/whitelist  admin list / CSV / delete
  api/cron/backup      daily snapshot
components/os/         GiwatronOS, SiteChrome, NavBar, Hero, PixelField, CRTLayer,
                       SystemLog, UnitDatabase, WhitelistGate, Faq, Footer, ...
components/whitelist/  WhitelistProtocol
components/game/       ArcadeGame
lib/                   db (Redis), quest (signed cookie), whitelist, scores,
                       rate-limit, http (guards), admin, env, crypto, units, site
scripts/generate-secrets.mjs
```

See `SECURITY.md` for the full security checklist and test results.
The pre-redesign project is archived in `../_archive/megatron-arcade-v1`.
