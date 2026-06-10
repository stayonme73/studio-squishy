/**
 * Site-wide configuration for Studio Squishy.
 * Copy and URLs only — no product promises or guarantee language.
 */
export const siteConfig = {
  name: "Studio Squishy",
  description:
    "A warm industrial workspace where ideas take shape — hosted by Squishy.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  routes: {
    home: "/",
    studio: "/studio",
  },
} as const;
