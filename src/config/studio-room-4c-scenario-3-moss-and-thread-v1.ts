/**
 * Room 4C Scenario 3 — Moss & Thread Studio Open Weekend.
 * Owner-approved fictional certification facts. Production stays blocked
 * until the customer-fact source gate and photo-rights gate both pass.
 */

import {
  MOSS_THREAD_CERTIFICATION_PHOTO_PACK,
  MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
} from "./studio-room-4c-scenario-3-photo-pack-v1";

export const ROOM_4C_SCENARIO_3_PACKAGE_ID =
  "STUDIO-OPERATING-ROOM-4C-MULTI-SERVICE-CLIENT-GAUNTLET-1" as const;

export const ROOM_4C_SCENARIO_3_ID =
  "scenario-3-photo-led-campaign" as const;

export const ROOM_4C_SCENARIO_3_CAMPAIGN_ID =
  "room-4c-s3-moss-and-thread-studio" as const;

export const MOSS_THREAD_ASSET_IDS = {
  productTextile1: "moss-thread-product-textile-1",
  productTextile2: "moss-thread-product-textile-2",
  makerPortrait: "moss-thread-maker-at-work",
  studioInterior: "moss-thread-studio-interior",
} as const;

export const MOSS_THREAD_AUTHORIZED_BUSINESS_NAME =
  "Moss & Thread Studio" as const;
export const MOSS_THREAD_AUTHORIZED_EVENT = "Studio Open Weekend" as const;
export const MOSS_THREAD_AUTHORIZED_DATES = "November 7–8, 2026" as const;
export const MOSS_THREAD_AUTHORIZED_LOCATION =
  "214 Loom Street, Richmond, Virginia" as const;
export const MOSS_THREAD_AUTHORIZED_SATURDAY_HOURS =
  "10:00 AM–5:00 PM" as const;
export const MOSS_THREAD_AUTHORIZED_SUNDAY_HOURS =
  "11:00 AM–4:00 PM" as const;
export const MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY =
  "Saturday 10:00 AM–5:00 PM; Sunday 11:00 AM–4:00 PM" as const;
export const MOSS_THREAD_AUTHORIZED_CTA = "Visit the open studio" as const;
export const MOSS_THREAD_AUTHORIZED_EVENT_URL =
  "mossthread.example/open-weekend" as const;
export const MOSS_THREAD_AUTHORIZED_EMAIL =
  "hello@mossthread.example" as const;
export const MOSS_THREAD_AUTHORIZED_ADMISSION = "Free to visit" as const;
export const MOSS_THREAD_AUTHORIZED_CLAIM =
  "visitors may view the studio, meet the maker, and shop available textile pieces in person" as const;
export const MOSS_THREAD_CERTIFICATION_STATUS =
  "All business, event, address, contact, and offer facts are fictional and owner-approved solely for Studio certification." as const;

/** Package-open substance. Dates display follows the owner stamp. */
export const MOSS_THREAD_PACKAGE_LOCKED = {
  businessName: MOSS_THREAD_AUTHORIZED_BUSINESS_NAME,
  craftCategory: "textile / soft-goods maker",
  offerName: MOSS_THREAD_AUTHORIZED_EVENT,
  windowDisplay: MOSS_THREAD_AUTHORIZED_DATES,
  windowStartIso: "2026-11-07",
  windowEndIso: "2026-11-08",
  photosAreCustomerSupplied: false,
  photosAreStudioGeneratedCertificationFixtures: true,
  distinctFromNiaWellness: true,
  carouselForbidden: true,
} as const;

export const MOSS_THREAD_FORBIDDEN_INVENTIONS = [
  "product prices",
  "discounts",
  "demonstrations",
  "workshops",
  "refreshments",
  "giveaways",
  "limited quantities",
  "custom-order availability",
  "accessibility claims",
  "parking information",
  "shipping",
  "phone number",
  "additional event activities",
] as const;

export const MOSS_THREAD_PHOTO_RIGHTS = {
  ...MOSS_THREAD_PHOTO_PACK_SHARED_RIGHTS,
  makerImage: {
    assetId: MOSS_THREAD_ASSET_IDS.makerPortrait,
    likenessType: "SYNTHETIC_FICTIONAL_PERSON_NO_REAL_LIKENESS" as const,
    realPersonConsentRequired: false as const,
    publicFigure: false as const,
  },
  boundFiles: MOSS_THREAD_CERTIFICATION_PHOTO_PACK.map((file) => ({
    assetId: file.assetId,
    filename: file.filename,
    sha256: file.sha256,
    category: file.category,
  })),
  productTruth:
    "Use the bound certification-fixture product and maker photographs as the product. Do not restyle, relabel, or replace them with generated goods that change what a visitor would see.",
  requiredRoles: [
    {
      assetId: MOSS_THREAD_ASSET_IDS.productTextile1,
      role: "product" as const,
      label: "Certification fixture product photograph 1",
    },
    {
      assetId: MOSS_THREAD_ASSET_IDS.productTextile2,
      role: "product" as const,
      label: "Certification fixture product photograph 2",
    },
    {
      assetId: MOSS_THREAD_ASSET_IDS.makerPortrait,
      role: "maker" as const,
      label: "Certification fixture maker photograph",
    },
    {
      assetId: MOSS_THREAD_ASSET_IDS.studioInterior,
      role: "studio" as const,
      label: "Certification fixture studio photograph",
    },
  ],
} as const;

export const studioRoom4cScenario3MossAndThreadV1 = {
  schemaVersion: 1 as const,
  packageId: ROOM_4C_SCENARIO_3_PACKAGE_ID,
  scenarioId: ROOM_4C_SCENARIO_3_ID,
  campaignId: ROOM_4C_SCENARIO_3_CAMPAIGN_ID,
  fictional: true as const,
  certificationStatus: MOSS_THREAD_CERTIFICATION_STATUS,
  productionStatus: "NOT_STARTED" as const,
  factApprovalStatus: "OWNER_APPROVED_FOR_CERTIFICATION" as const,
  ownerVerificationPending: true as const,
  customer: {
    businessName: MOSS_THREAD_AUTHORIZED_BUSINESS_NAME,
    craftCategory: MOSS_THREAD_PACKAGE_LOCKED.craftCategory,
    locationDisplay: MOSS_THREAD_AUTHORIZED_LOCATION,
  },
  offer: {
    name: MOSS_THREAD_AUTHORIZED_EVENT,
    windowDisplay: MOSS_THREAD_AUTHORIZED_DATES,
    windowStartIso: "2026-11-07",
    windowEndIso: "2026-11-08",
    hoursSaturdayDisplay: MOSS_THREAD_AUTHORIZED_SATURDAY_HOURS,
    hoursSundayDisplay: MOSS_THREAD_AUTHORIZED_SUNDAY_HOURS,
    hoursDisplay: MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY,
    admissionDisplay: MOSS_THREAD_AUTHORIZED_ADMISSION,
    visitorClaim: MOSS_THREAD_AUTHORIZED_CLAIM,
  },
  tone: {
    voice: "Warm, handmade, grounded. Textile studio, not wellness.",
    noNeon: true as const,
    noBeforeAfterBody: true as const,
    calmWellness: false as const,
    distinctFromNia: true as const,
  },
  cta: {
    label: MOSS_THREAD_AUTHORIZED_CTA,
    eventUrl: MOSS_THREAD_AUTHORIZED_EVENT_URL,
    supportEmail: MOSS_THREAD_AUTHORIZED_EMAIL,
    phoneAuthorized: false as const,
  },
  photoRights: MOSS_THREAD_PHOTO_RIGHTS,
  approvedClaims: [MOSS_THREAD_AUTHORIZED_CLAIM] as const,
  forbiddenInventions: MOSS_THREAD_FORBIDDEN_INVENTIONS,
  requestedDeliverables: [
    {
      id: "campaign-direction",
      launchNowService: "campaign-creative",
      output: "written direction bound to one brief and customer photos",
    },
    {
      id: "social-square",
      launchNowService: "campaign-creative",
      output: "photo-led square PNG 1080x1080",
    },
    {
      id: "social-vertical",
      launchNowService: "campaign-creative",
      output: "photo-led vertical PNG 1080x1920",
    },
    {
      id: "short-vertical-video",
      launchNowService: "short-form-video",
      output: "vertical MP4 ~20-30s; motion-safe; synchronized narration",
    },
    {
      id: "promo-copy",
      launchNowService: "marketing-copy-email",
      output: "paste-ready promotional copy / caption",
    },
    {
      id: "print-invite",
      launchNowService: "print-collateral",
      output:
        "US Letter invitation/handout, 8.5×11 inches, print-ready PDF and 2550×3300 PNG",
    },
  ],
  refusedIfAsked: [
    "carousel",
    "ad_account_ops",
    "unsupported_sizes_outside_studio_contracts",
    "nia_wellness_language",
    "studio_generated_product_photo_as_customer_photo",
    "invented_phone",
    "invented_product_price",
    "invented_event_activity",
  ],
  visualSystemId: "moss-and-thread-studio-v1" as const,
  printHandoutContractId: "campaign-print-handout-v2-us-letter" as const,
  facts: {
    headline: MOSS_THREAD_AUTHORIZED_EVENT,
    supportingCopy: MOSS_THREAD_AUTHORIZED_CLAIM,
    datesDisplay: MOSS_THREAD_AUTHORIZED_DATES,
    hoursDisplay: MOSS_THREAD_AUTHORIZED_HOURS_DISPLAY,
    locationDisplay: MOSS_THREAD_AUTHORIZED_LOCATION,
    priceDisplay: MOSS_THREAD_AUTHORIZED_ADMISSION,
    cta: MOSS_THREAD_AUTHORIZED_CTA,
    bookingContact: MOSS_THREAD_AUTHORIZED_EVENT_URL,
    emailDisplay: MOSS_THREAD_AUTHORIZED_EMAIL,
  },
} as const;

export type StudioRoom4cScenario3MossAndThreadBrief =
  typeof studioRoom4cScenario3MossAndThreadV1;
