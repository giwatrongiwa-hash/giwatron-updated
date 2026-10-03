# Security

Launch checklist for GIWATRON. Status: ✅ done in code · 🔧 needs one action by
the owner in a dashboard · ➖ not applicable (feature does not exist).

Attack surface: two pages (`/`, `/whitelist`) and these JSON endpoints —
`/api/quest`, `/api/whitelist`, `/api/game/start`, `/api/game/claim`,
`/api/admin/whitelist`, `/api/cron/backup`. No login, no passwords for
visitors, no uploads, no payments, no wallet connection.

| #  | Item | Status | Where / how |
|----|------|--------|-------------|
| 1  | Keys out of code | ✅ | Every secret is read from env in `lib/env.ts`; no fallback values; min length 32. `.env.example` has empty placeholders only. |
| 2  | `.env` out of history | ✅ | No git history exists for this folder (deployed via Vercel CLI). `.gitignore` and `.vercelignore` exclude `.env*` and `.data`, so local secrets are never uploaded. Verified: `/.env`, `/.env.local`, `/.vercel/project.json` return 404 in production build. |
| 3  | Database permission rules | ✅ | `lib/db.ts` header. Redis token is server-only; browser never talks to the DB; fixed key prefixes; uniqueness via `SET NX`; counters/backups auto-expire. Production refuses registrations (503) if no DB is attached instead of silently losing data. |
| 4  | Authorization checked on the server | ✅ | Protocol state is an HMAC-signed httpOnly cookie written only by the server (`lib/quest.ts`). `/api/whitelist` registers only if the server-signed state says verified; the 30s wait uses server time. Tampered cookies are discarded. |
| 5  | Limit attempts | ✅ | Shared Redis rate limits (`lib/rate-limit.ts`): quest 60/10min, whitelist 5/10min, game 30/10min, admin 10/10min (every attempt counts). IPs are stored only as keyed hashes. |
| 6  | Validate input on the server | ✅ | Strict allowlists: EVM `0x`+40 hex, X handle `[a-z0-9_]{1,15}`, task names from a fixed list, integer scores, type checks on every field. |
| 7  | Limit uploads | ✅ | No upload endpoints. Every JSON body has a hard byte cap (256 B–2 KB) and must be `application/json` (`lib/http.ts`). |
| 8  | CORS locked to own domain | ✅ | No `Access-Control-Allow-Origin` is ever sent; POSTs with a foreign `Origin` → 403; form posts → 415. |
| 10 | Security headers | ✅ | `next.config.ts`: CSP (self only, `object-src 'none'`, `frame-ancestors 'none'`), HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, CORP; `X-Powered-By` off; APIs `no-store` + `noindex`. |
| 11 | Force HTTPS | ✅ | Vercel redirects http→https; HSTS 2 years + preload; CSP `upgrade-insecure-requests`; cookie is `Secure`. |
| 12 | Hash passwords | ✅ | Visitors have no passwords. The only credential (admin token) is stored as a SHA-256 hash (`ADMIN_TOKEN_HASH`) and compared in constant time. |
| 13 | Secure session cookie | ✅ | `__Host-gw_protocol`: `HttpOnly; Secure; SameSite=Strict; Path=/`, 2h lifetime, HMAC-signed. |
| 14 | Simple error messages | ✅ | Clients get short generic errors; details (e.g. anti-cheat reason) go to server logs only. |
| 15 | No tokens in logs | ✅ | Logs contain masked addresses only (`0x1234…abcd`); run tokens, cookies, admin/cron secrets are never logged (verified by grep of server logs during testing). |
| 16 | Parameterized queries | ✅ | No SQL. Redis commands are sent as JSON argument arrays, never string-built. |
| 17 | Escape output (XSS) | ✅ | React escapes all output; no `dangerouslySetInnerHTML`; inputs are allowlisted before storage; CSV export contains only validated characters. |
| 18 | Verify webhook signatures | ✅ / ➖ | No third-party webhooks. The only inbound machine call (Vercel Cron) is checked against `CRON_SECRET` in constant time. |
| 19 | Roles on admin endpoints | ✅ | `/api/admin/whitelist` requires the admin bearer token (single "admin" role); returns 404 if admin is not configured. |
| 20 | Audit / update packages | ✅ | `npm audit`: 0 vulnerabilities. Updated to Next 16.3.6, React 19.3.0. Re-run `npm audit` before each deploy. |
| 21 | Automated backups | ✅ + 🔧 | Vercel Cron (`vercel.json`) snapshots the whitelist daily at 03:00 UTC into `backup:<date>` (kept 30 days). Also enable Upstash's own daily backup in its console, and export the CSV via the admin API before the mint. |
| 22 | Deleted really deleted | ✅ | `DELETE /api/admin/whitelist?wallet=…` removes the record, its locks, and scrubs the address from every retained backup snapshot. |
| 23 | Spending alerts | 🔧 | Vercel → Settings → Billing → Spend Management: set a limit + email alert. Upstash console → database → set a budget / max monthly cost. |

## Attacker-style test (run against a production build)

48/48 checks passed, including:

- register without / with unverified / with forged (backdated) protocol cookie → rejected
- verify before 30s (server clock) → 425; after 30s → allowed
- XSS payload, SQL-style payload, wrong types, oversized handle, bad hex → 400
- same session registering twice, replaying an old cookie → 409
- cross-origin POST → 403, form-encoded POST → 415, 5 KB body → 413, broken JSON → 400
- rate limits trigger at the configured thresholds (incl. admin brute force)
- admin: no token / wrong token → 401, correct token → list + CSV; hard delete also removes from backups
- cron with wrong secret → 401
- arcade: impossible score, non-integer score, forged signature, replayed run → rejected
- security headers present, no `X-Powered-By`, `/.env*`, `/.data`, source files → 404
- page HTML contains no secrets and no password gate
- production without a database → registration returns 503 (fails closed)

## Known limitations

- **X tasks cannot be truly verified** without X's paid API and per-user
  OAuth. The protocol proves each task link was opened and enforces the
  30-second wait server-side; the X handle is stored so entries can be
  reviewed manually before allocation.
- CSP allows inline scripts (`'unsafe-inline'`) because Next.js needs them
  without per-request nonces. Mitigated by React escaping and no
  user-supplied HTML anywhere.
