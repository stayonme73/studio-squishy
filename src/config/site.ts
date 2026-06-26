/**
 * Site-wide configuration for The Studio.
 * Copy and URLs only — no product promises or guarantee language.
 */
export const siteConfig = {
  name: "The Studio",
  description:
    "A warm creative workspace where marketing takes shape — without you becoming the marketer.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  routes: {
    home: "/",
    studioGuide: "/studio-guide",
    studio: "/studio",
    projectDiscovery: "/business-discovery-studio",
    /** @deprecated legacy URL — redirects to Project Discovery */
    draftRoom: "/draft-room",
    intake: "/intake",
  },
} as const;
