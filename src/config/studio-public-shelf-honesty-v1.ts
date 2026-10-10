/**
 * Public shelf honesty — customer-visible service choices = certified SELL NOW 11.
 * Internal factories stay. Unpublished / V1-continuing / held Voice stay off the public shelf.
 *
 * SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10): the old shelf is not the customer-facing
 * launch menu. History and internal reference only; the counts below are what the old shelf
 * showed on 2026-09-26, not the current launch count. Launch truth:
 * `studio-canonical-launch-truth-v1.ts`.
 */

import {
  INTERNAL_SELL_NOW_SKUS,
  LEGACY_SHELF_NON_AUTHORITY,
} from "@/config/studio-internal-sell-now-register-v1";

export const STUDIO_PUBLIC_SHELF_HONESTY_PACKAGE_ID =
  "STUDIO-OPERATING-PUBLIC-SHELF-HONESTY-1" as const;

/** The five entries that made live shelf 16. Not purchasable for a stranger. */
export const PUBLIC_SHELF_WITHHELD_ENTRIES = [
  {
    id: "v2-rtu-voice",
    name: "Make Me a Voice Announcement",
    why: "NOT_AUTONOMOUS_HOLD. In activation map as active_candidate, not in certified public 11.",
  },
  {
    id: "rm-j002",
    name: "Make Me a Social Profile Setup Kit",
    why: "Continuing V1 job held for Batch 3. Factory remains.",
  },
  {
    id: "rm-j005",
    name: "Make Me a Page for My Sale, Event, Opening, Service, or Offer",
    why: "Continuing V1 job held for Batch 3. Factory remains.",
  },
  {
    id: "rm-j007",
    name: "Update My Existing Promotion",
    why: "Continuing V1 job. No V2 RTU equivalent. Factory remains.",
  },
  {
    id: "rm-j008",
    name: "Make Me a Social Profile Update Kit",
    why: "Continuing V1 job held for Batch 3. Factory remains.",
  },
] as const;

export const studioPublicShelfHonestyV1 = {
  packageId: STUDIO_PUBLIC_SHELF_HONESTY_PACKAGE_ID,
  authorizedAt: "2026-09-26" as const,
  ...LEGACY_SHELF_NON_AUTHORITY,
  beforeCustomerVisibleCount: 16 as const,
  afterCustomerVisibleCount: 11 as const,
  publicSellNowSkus: INTERNAL_SELL_NOW_SKUS,
  withheldEntries: PUBLIC_SHELF_WITHHELD_ENTRIES,
  doNotDeleteInternalFactories: true as const,
  doNotStartWebsite: true as const,
  doNotStartBeta: true as const,
  doNotStartMarketing: true as const,
  doNotStartStripeLive: true as const,
  doNotStartCapacity: true as const,
} as const;
