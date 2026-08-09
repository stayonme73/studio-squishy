/**
 * Studio Kitchen Production Capability V1 — service production contracts config.
 *
 * Authority: docs/studio-production-capability-doctrine-v1-locked.md
 * Motto: The Studio sells only what its approved team can truthfully produce.
 */

export const STUDIO_KITCHEN_PRODUCTION_CAPABILITY_VERSION = "1.0.0" as const;

export const studioKitchenProductionCapability = {
  version: STUDIO_KITCHEN_PRODUCTION_CAPABILITY_VERSION,
  sectionTitle: "Production contract",
  sectionLead:
    "Who makes this service, with what, what is required, how it is checked, and what the customer receives — projected from the locked production-capability registry over catalog authority. CONTRACT READY means the production contract is defined for quality testing — not that the service is customer-ready or launch-certified.",
  emptyContract: "No production contract for this SKU in the active capability set.",
  readinessDisclaimer:
    "CONTRACT READY is not CUSTOMER READY or LAUNCH READY. Certification and any required integrations come later.",
  deferred: [
    "Live Canva API integration",
    "CapCut integration",
    "Make integration",
    "AI voice vendor Kitchen chain",
    "Live email / SMS sending",
    "Social OAuth / account automation",
    "Studio Voice live production Q&A",
    "Owner Console redesign",
    "Supabase production SoR migration",
    "Landing-page unlimited Customer Ready / CERTIFIED (KITCHEN-LANDING-PAGE-PRODUCTION-1 sealed CUSTOMER READY WITH LIMITS — per-artifact responsive + CTA/QR QA; custom domain separate)",
    "Real service production testing / certification runs",
    "Broad Squishy cleanup",
  ],
} as const;
