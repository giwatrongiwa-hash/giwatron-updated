export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Strips characters that have no business being in a short user-supplied field. Defense in depth — React already escapes JSX output. */
export function sanitizeInput(raw: string, maxLen = 64): string {
  return raw
    .replace(/[<>`$]/g, "")
    .trim()
    .slice(0, maxLen);
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Allowlist check shared by the whitelist form (live feedback) and the API route (authoritative check). */
export function isValidWalletFormat(wallet: string): boolean {
  return EVM_ADDRESS_RE.test(wallet.trim());
}
