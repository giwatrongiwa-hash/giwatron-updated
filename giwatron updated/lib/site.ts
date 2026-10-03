/** Site-wide constants. Only links the project owner has provided belong here. */
export const X_HANDLE = "GIWATRON";
/** Official X profile. */
export const X_URL = "https://x.com/Giwatron";
/** Tweet used by the whitelist tasks. */
export const WHITELIST_TWEET_URL = "https://x.com/Giwatron/status/2104687698011390279";


/** Home page sections shown in the nav (the whitelist is its own page). */
export const NAV_SECTIONS = [
  { id: "system", label: "system" },
  { id: "database", label: "database" },
  { id: "arcade", label: "arcade" },
  { id: "faq", label: "faq" },
] as const;

export type SectionId = (typeof NAV_SECTIONS)[number]["id"];

/** Prefilled whitelist quote; the original post URL is included for X's quote preview. */
export const WHITELIST_QUOTE_URL = `https://x.com/intent/tweet?${new URLSearchParams({
  text: `// GIWATRON WHITELIST

> operator ready.
> awaiting access...

@${X_HANDLE}`,
  url: WHITELIST_TWEET_URL,
})}`;
