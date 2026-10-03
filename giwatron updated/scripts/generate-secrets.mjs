#!/usr/bin/env node
/**
 * Prints fresh values for every secret this project uses.
 *
 *   node scripts/generate-secrets.mjs
 *
 * Put GAME_SECRET, SESSION_SECRET, CRON_SECRET and ADMIN_TOKEN_HASH into
 * Vercel → Settings → Environment Variables. Keep ADMIN_TOKEN somewhere
 * private (password manager) — it is NOT stored anywhere by the site, only
 * its hash is.
 */
import { randomBytes, createHash } from "node:crypto";

const hex = (n) => randomBytes(n).toString("hex");
const adminToken = randomBytes(32).toString("base64url");

console.log("# --- add these to Vercel (Production) ---");
console.log(`GAME_SECRET=${hex(32)}`);
console.log(`SESSION_SECRET=${hex(32)}`);
console.log(`CRON_SECRET=${hex(32)}`);
console.log(`ADMIN_TOKEN_HASH=${createHash("sha256").update(adminToken).digest("hex")}`);
console.log("");
console.log("# --- keep this one PRIVATE, do not put it in Vercel ---");
console.log(`ADMIN_TOKEN=${adminToken}`);
