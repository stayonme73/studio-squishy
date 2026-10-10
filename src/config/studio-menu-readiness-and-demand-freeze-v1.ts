/**
 * Launch menu readiness + demand freeze.
 * Certifies the public 11. Does not expand the menu.
 *
 * SUPERSEDED FOR LAUNCH (owner ruling 2026-10-10): the 11 is the old Launch Now shelf,
 * not the launch menu. The SKUs and prices below are the historical old-shelf freeze
 * (including $349 Short-Form and $549 Clip). They are not current launch prices and do not
 * drive customer availability. Launch truth: `studio-canonical-launch-truth-v1.ts`.
 */

import {
  INTERNAL_SELL_NOW_SKUS,
  LEGACY_SHELF_NON_AUTHORITY,
} from "@/config/studio-internal-sell-now-register-v1";
import { PUBLIC_SHELF_WITHHELD_ENTRIES } from "@/config/studio-public-shelf-honesty-v1";

export const STUDIO_MENU_READINESS_AND_DEMAND_FREEZE_PACKAGE_ID =
  "STUDIO-OPERATING-MENU-READINESS-AND-DEMAND-FREEZE-1" as const;

export const LAUNCH_MENU_FROZEN_SKUS = INTERNAL_SELL_NOW_SKUS;

export const LAUNCH_MENU_FROZEN_PRICES_CENTS = {
  "v2-rtu-flyer": 6900,
  "v2-rtu-promotion-graphics": 7900,
  "v2-rtu-social-posts": 9900,
  "v2-rtu-business-card": 6900,
  "v2-rtu-menu": 8900,
  "v2-rtu-service-sheet": 7900,
  "v2-rtu-email-kit": 12900,
  "v2-rtu-sms-kit": 6900,
  "v2-rtu-short-video": 14900,
  "v2-rtu-short-form-video-edit": 34900,
  "v2-rtu-clip-repurposing": 54900,
} as const;

/** Public promise compatible with honest wait. Not a capacity certification. */
export const LAUNCH_MENU_HONEST_TIMING_LABEL =
  "Production begins when a Studio production slot is available after you submit Project Details and required materials. The Studio will not invent a start date or a delivery date." as const;

/** Compact Studio Plan row. Same freeze — no invented dates. */
export const LAUNCH_MENU_HONEST_TIMING_SHORT_LABEL =
  "When a production slot is available" as const;

export const LAUNCH_MENU_FREEZE_ALLOWED_CHANGES = [
  "genuine_defect_fix",
  "legal_or_rights_correction",
  "factual_correction",
  "owner_approved_commercial_exception",
] as const;

export const LAUNCH_MENU_FREEZE_FORBIDDEN_CHANGES = [
  "add_service_without_owner_decision",
  "expand_scope_for_marketing",
  "lower_quality_to_absorb_demand",
  "publish_withheld_or_kitchen_only_factory",
  "promise_unlimited_capacity_or_invented_dates",
] as const;

export const studioMenuReadinessAndDemandFreezeV1 = {
  packageId: STUDIO_MENU_READINESS_AND_DEMAND_FREEZE_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  verdict: "PASS_WITH_EXPLICIT_LIMITS" as const,
  ...LEGACY_SHELF_NON_AUTHORITY,
  /** Historical: the old shelf count on 2026-09-27. Not the launch count. */
  publicLaunchCount: 11 as const,
  internalSellNowCount: 11 as const,
  frozenSkus: LAUNCH_MENU_FROZEN_SKUS,
  frozenPricesCents: LAUNCH_MENU_FROZEN_PRICES_CENTS,
  withheldFromPublic: PUBLIC_SHELF_WITHHELD_ENTRIES,
  kitchenFactoryCount: 22 as const,
  carousel: "NOT_ON_LAUNCH_MENU" as const,
  honestTimingLabel: LAUNCH_MENU_HONEST_TIMING_LABEL,
  honestTimingShortLabel: LAUNCH_MENU_HONEST_TIMING_SHORT_LABEL,
  capacityCertified: false as const,
  doNotCapacityCertifyHere: true as const,
  allowedDuringFreeze: LAUNCH_MENU_FREEZE_ALLOWED_CHANGES,
  forbiddenDuringFreeze: LAUNCH_MENU_FREEZE_FORBIDDEN_CHANGES,
  doNotAddService: true as const,
  doNotReopenFrozenServicesUnlessRegression: true as const,
  doNotLowerQuality: true as const,
  doNotInventDemandOrMarginData: true as const,
  economics: {
    evidencedUnitEconomics: false as const,
    noServiceRemovedForEconomics: true as const,
    noPriceChangeWithoutOwner: true as const,
    notes: [
      "No evidenced margins, conversion rates, or operating capacity.",
      "Internal harden production-time ceilings are factory targets, not public promises.",
      "One Clip Repurposing live job recorded vendor spend well below $549; that is not a margin proof and does not authorize a price cut.",
      "Keep all 11 on the launch menu. Do not lower quality. Price/scope change requires Owner.",
    ] as const,
  },
  nextLockedSequencePackage: "owner_as_customer_real_campaign" as const,
  nextPackageId: "STUDIO-OPERATING-OWNER-AS-CUSTOMER-REAL-STUDIO-CAMPAIGN-1" as const,
  nextPackageStarted: false as const,
  doNotStartNextFromThisStamp: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  stampDoc:
    "docs/launch/studio-operating-menu-readiness-and-demand-freeze-1/STUDIO-OPERATING-MENU-READINESS-AND-DEMAND-FREEZE.md" as const,
  proofJson:
    "docs/launch/studio-operating-menu-readiness-and-demand-freeze-1/proof.json" as const,
} as const;
