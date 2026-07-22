/**
 * Canonical site origin — used for metadataBase, sitemap and robots.
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://kaap.example.com).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
