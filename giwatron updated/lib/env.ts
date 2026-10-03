/**
 * Central place that reads server-side secrets.
 *
 * SECURITY: no secret VALUES live in source. They come from `.env.local`
 * (gitignored, never deployed — see .vercelignore) in dev and from Vercel's
 * environment variable store in production. Required secrets have no
 * fallback: a missing one fails fast instead of running with a guessable
 * default.
 */

function required(name: string): string {
  const val = process.env[name];
  if (val && val.length >= 32) return val;
  throw new Error(
    `[env] Missing or too short environment variable: ${name} (min 32 chars). ` +
      `Set it in .env.local (dev) or Vercel → Settings → Environment Variables (production).`
  );
}

function optional(name: string): string | null {
  const val = process.env[name];
  return val && val.length > 0 ? val : null;
}

export const env = {
  /** HMAC key for the arcade's anti-cheat run tokens. */
  get GAME_SECRET() {
    return required("GAME_SECRET");
  },
  /** HMAC key for the whitelist protocol cookie and for hashing IPs in rate-limit keys. */
  get SESSION_SECRET() {
    return required("SESSION_SECRET");
  },
  /** SHA-256 hex of the admin token (the token itself is never stored). Unset = admin API disabled. */
  get ADMIN_TOKEN_HASH() {
    return optional("ADMIN_TOKEN_HASH");
  },
  /** Vercel sends this as a Bearer token to cron routes. Unset = cron route disabled. */
  get CRON_SECRET() {
    return optional("CRON_SECRET");
  },
};
