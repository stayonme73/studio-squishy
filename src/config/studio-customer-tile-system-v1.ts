/**
 * Customer tile system V1 — APPROVED reusable surface family.
 * Visual paint comes from MOBILE_VISUAL_MASTER / Voice Choice Samsung reference.
 * Do not invent a second glass. Consume classNames / CSS tokens.
 *
 * @see docs/studio-customer-tile-system-v1.md
 * @see src/app/studio-customer-tile-system.css
 * @see src/config/mobile-customer-spine-palette-v1.ts
 */

import { MOBILE_VISUAL_MASTER } from "@/config/mobile-customer-spine-palette-v1";

export const STUDIO_CUSTOMER_TILE_SYSTEM_STATUS = "APPROVED" as const;

const ivory = MOBILE_VISUAL_MASTER.ivory;
const cream = MOBILE_VISUAL_MASTER.cream;
const denim = MOBILE_VISUAL_MASTER.denim;
const eucalyptus = MOBILE_VISUAL_MASTER.eucalyptus;
const ink = MOBILE_VISUAL_MASTER.ink;

/** Exact A-B-C-1-2-3. Reuse these strings; do not restated as new percentages. */
export const studioCustomerTileRecipesV1 = {
  standardFill: `color-mix(in srgb, color-mix(in srgb, ${ivory} ${MOBILE_VISUAL_MASTER.glassIvoryPct}%, ${cream} ${MOBILE_VISUAL_MASTER.glassCreamPct}%) ${MOBILE_VISUAL_MASTER.glassOpacityPct}%, transparent)`,
  standardDenseFill: `color-mix(in srgb, color-mix(in srgb, ${ivory} 70%, ${cream} 30%) ${MOBILE_VISUAL_MASTER.glassStrongOpacityPct}%, transparent)`,
  quietFill: `color-mix(in srgb, ${ivory} 40%, transparent)`,
  selectedFill: `color-mix(in srgb, ${denim} 22%, ${ivory})`,
  glassBorder: `color-mix(in srgb, ${denim} ${MOBILE_VISUAL_MASTER.glassBorderDenimPct}%, ${ivory})`,
  glassFilterLiteral: MOBILE_VISUAL_MASTER.glassFilterLiteral,
  glassInsetHighlight: "inset 0 1px 0 rgba(255, 255, 255, 0.35)",
  radiusTile: "0.85rem",
  radiusStage: "1.35rem",
  radiusAction: "0.55rem",
} as const;

export const studioCustomerTileSystemV1 = {
  schemaVersion: 1 as const,
  status: STUDIO_CUSTOMER_TILE_SYSTEM_STATUS,
  visualMaster: "MOBILE_VISUAL_MASTER" as const,
  samsungSourceOfTruth:
    "Voice Choice light glass on the real Samsung — match what the eye sees" as const,
  doNotRedesignJourney: true as const,
  applyOnlyAfterOwnerReview: false as const,
  approvedAt: "2026-09-05" as const,
  applyingSection: "conversation-room" as const,
  doNotMergeUntilOwnerReview: true as const,
  cssFile: "src/app/studio-customer-tile-system.css" as const,

  classNames: {
    standardLight: "studio-tile--standard",
    standardDense: "studio-tile--standard-dense",
    selectedActive: "studio-tile--selected",
    supportingQuiet: "studio-tile--quiet",
    primaryAction: "lobby-entry-film__cta",
    secondaryAction: "studio-action--secondary",
  } as const,

  categories: {
    standardLight: {
      id: "standard-light" as const,
      role: "Default customer information / plan / summary / status tile",
      fill: studioCustomerTileRecipesV1.standardFill,
      frost: studioCustomerTileRecipesV1.glassFilterLiteral,
      border: `1px solid ${studioCustomerTileRecipesV1.glassBorder}`,
      radius: studioCustomerTileRecipesV1.radiusTile,
      shadow: studioCustomerTileRecipesV1.glassInsetHighlight,
      labelColor: eucalyptus,
      valueColor: ink,
      helperColor: `color-mix(in srgb, ${ink} 88%, transparent)`,
      headingColor: ink,
      typeOnStagePanels: ivory,
      notes:
        "Same paint as Voice Choice .panel. Child tiles use ink type. Stage/gate panels already owner-accepted with ivory type stay as they are.",
    },
    standardDense: {
      id: "standard-dense" as const,
      role: "Dense forms only — Help, Auth, Project Record, long intake fields",
      fill: studioCustomerTileRecipesV1.standardDenseFill,
      frost: studioCustomerTileRecipesV1.glassFilterLiteral,
      border: `1px solid ${studioCustomerTileRecipesV1.glassBorder}`,
      radius: studioCustomerTileRecipesV1.radiusTile,
      notes:
        "Same family as standard-light. Stronger ivory mix so mural lettering does not compete with form fields. Not a new style.",
    },
    selectedActive: {
      id: "selected-active" as const,
      role: "Selection hierarchy only — chosen route, added service, selected chip",
      fill: studioCustomerTileRecipesV1.selectedFill,
      border: `1px solid ${denim}`,
      radius: studioCustomerTileRecipesV1.radiusTile,
      textColor: ink,
      notes:
        "Approved Denim emphasis. Do not use on ordinary reading cards.",
    },
    supportingQuiet: {
      id: "supporting-quiet" as const,
      role: "Secondary instructional areas such as Before Checkout",
      fill: studioCustomerTileRecipesV1.quietFill,
      frost: "none",
      border: `1px solid color-mix(in srgb, ${denim} 18%, ${ivory})`,
      radius: "0.75rem",
      headingColor: `color-mix(in srgb, ${eucalyptus} 70%, ${ivory})`,
      textColor: `color-mix(in srgb, ${ink} 68%, transparent)`,
      notes: "Quieter than primary customer content. Do not promote to standard-light.",
    },
    primaryAction: {
      id: "primary-action" as const,
      role: "Page-level CTA — Let’s Get Started, Continue, Checkout, and Voice Choice. Reuse Welcome `.lobby-entry-film__cta`. Do not restyle the fill.",
      className: "lobby-entry-film__cta",
      fill: denim,
      border: `1px solid ${denim}`,
      radius: studioCustomerTileRecipesV1.radiusAction,
      textColor: ivory,
      disabledOpacity: 0.55,
      notes: "Reuse Welcome CTA. Do not restyle the fill.",
    },
    secondaryAction: {
      id: "secondary-action" as const,
      role: "Edit / Change / Back / Remove — not the page CTA",
      fill: `color-mix(in srgb, ${ivory} 50%, transparent)`,
      border: `1.5px solid ${denim}`,
      textColor: denim,
      radius: studioCustomerTileRecipesV1.radiusAction,
      notes:
        "Denim outline. Keep existing button shape where already approved. Coral Correct something stays a locked exception.",
    },
  },

  approvedLockedSurfaces: {
    loungeEnvironment: "Preserve. Not a tile.",
    welcomeStageGlass: "OWNER_ACCEPTED — already standard-light at stage scale.",
    voiceChoiceStageGlass: "OWNER_ACCEPTED — Samsung visual source of truth.",
    nameQuestionThroughBusinessName: "OWNER_ACCEPTED — do not restyle.",
    materialsAndConfirmation: "OWNER_ACCEPTED.",
    chooseYourRoute: "OWNER_ACCEPTED — selected Denim stays.",
    step2ChooseYourServices: {
      status: "FROZEN_OWNER_ACCEPTED" as const,
      unselectedFill: `color-mix(in srgb, ${ivory} 32%, transparent)`,
      selected: "selected-active",
      loungePlate: "Welcome / Voice Choice lounge — 16% 42%, 18% veil, 2px. No separate 28px ivory frost plate.",
      rule: "Tiles stay. Containing lounge must match the rest of the customer path.",
    },
    coralCorrectCta: "LOCKED exception — #D94E2B. Not secondary-action.",
    studioReviewTab: "LOCKED utility tab. Not a customer tile.",
    routeMapHighwayArtwork: "Preserve. Not a tile.",
  },

  cousinsToRetireAfterReview: [
    "--mc-card 55% ivory with no frost (reads charcoal over Lounge)",
    "--mc-chip 50% ivory used as a card instead of a chip",
    "opaque #faf6ef / #ffffff utility cards on Lounge",
    "local rgba(247,244,238,0.07–0.25) charcoal-leaning fills",
    "page-local 32% / 40% / 78% / 92% ivory experiments on ordinary tiles",
    "Board / checkout / route-map blur(4–16px) recipes that are not the master filter",
  ] as const,

  samsungImplementationRules: [
    "Frost on a clipped plate or ::before with pointer-events none — never on the Fill / CTA node itself.",
    "Do not put a scrolling ancestor around a surface that must sample Lounge.",
    "Do not use isolation: isolate on these tiles.",
    "If HTML paints and controls are dead, diagnose hydration / chunk-load before rewriting handlers.",
  ] as const,
} as const;

export type StudioCustomerTileCategoryId =
  | "standard-light"
  | "standard-dense"
  | "selected-active"
  | "supporting-quiet"
  | "primary-action"
  | "secondary-action"
  | "locked-exception"
  | "not-a-tile";

export type StudioCustomerJourneyScreenInventory = {
  order: number;
  screen: string;
  route: string;
  ownerStatus: string;
  surfaces: string;
  proposedCategory: StudioCustomerTileCategoryId;
  normalizeAfterReview: boolean;
};

export const studioCustomerJourneyTileInventoryV1: readonly StudioCustomerJourneyScreenInventory[] =
  [
    {
      order: 1,
      screen: "Lounge / Welcome",
      route: "/ · /studio-lobby",
      ownerStatus: "OWNER_ACCEPTED",
      surfaces: "Lounge plate + Welcome entry film",
      proposedCategory: "standard-light",
      normalizeAfterReview: false,
    },
    {
      order: 2,
      screen: "Voice Choice",
      route: "/studio-conversation-room",
      ownerStatus:
        "OWNER_ACCEPTED panel/glass; 2026-09-06 buttons WELCOME_CTA_FAMILY",
      surfaces: "Stage panel + Let’s Get Started Welcome CTA family",
      proposedCategory: "primary-action",
      normalizeAfterReview: false,
    },
    {
      order: 3,
      screen: "Name / need / business-name questions",
      route: "/studio-conversation-room",
      ownerStatus: "OWNER_ACCEPTED",
      surfaces: "Question cluster on stage glass; chips",
      proposedCategory: "standard-light",
      normalizeAfterReview: false,
    },
    {
      order: 4,
      screen: "Materials + confirmation",
      route: "/studio-conversation-room",
      ownerStatus: "OWNER_ACCEPTED",
      surfaces: "Summary rows + Denim / Coral CTAs",
      proposedCategory: "standard-light",
      normalizeAfterReview: false,
    },
    {
      order: 5,
      screen: "Review Together",
      route: "/studio-conversation-room",
      ownerStatus: "Accepted with system; watch --mc-card rows",
      surfaces: "Summary rows",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 6,
      screen: "Choose Your Route",
      route: "/studio-conversation-room",
      ownerStatus: "OWNER_ACCEPTED",
      surfaces: "Route cards + Continue",
      proposedCategory: "selected-active",
      normalizeAfterReview: false,
    },
    {
      order: 7,
      screen: "Choose Your Services (Step 2)",
      route: "/studio-conversation-room",
      ownerStatus: "FROZEN",
      surfaces: "Job cards + Denim add CTA",
      proposedCategory: "locked-exception",
      normalizeAfterReview: false,
    },
    {
      order: 8,
      screen: "Review Studio Plan (Step 3)",
      route: "/studio-conversation-room",
      ownerStatus:
        "FUNCTIONAL intact 2026-09-05; Standard Light visual OPEN follow-up — not owner-approved",
      surfaces: "Route / Services / Investment / Timeline / Plan Details; Before Checkout; actions",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 9,
      screen: "Checkout / Payment",
      route: "/studio-conversation-room?stage=checkout",
      ownerStatus: "Not visually certified",
      surfaces: "Route label card, pay shell, terms, sandbox confirm",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 10,
      screen: "Project Intake",
      route: "/studio-conversation-room?stage=intake",
      ownerStatus: "Not visually certified",
      surfaces: "Intake cards, materials banner, status",
      proposedCategory: "standard-dense",
      normalizeAfterReview: true,
    },
    {
      order: 11,
      screen: "Account Handoff / Auth",
      route: "/account-handoff · /sign-up · /sign-in",
      ownerStatus: "Not visually certified",
      surfaces: "utility-card + primary/secondary buttons",
      proposedCategory: "standard-dense",
      normalizeAfterReview: true,
    },
    {
      order: 12,
      screen: "Studio Board",
      route: "/studio-board",
      ownerStatus: "Not visually certified on phone",
      surfaces: ".sb-card family, materials, composer",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 13,
      screen: "Materials Upload & Rights",
      route: "Board MaterialsIntakePanel",
      ownerStatus: "Rights logic CLOSED WITH LIMITS; visual not certified",
      surfaces: "Material slots, attestation radios",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 14,
      screen: "Communication / Status",
      route: "Board composer + status",
      ownerStatus: "Not visually certified on phone",
      surfaces: "Composer, notes, progress cards",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 15,
      screen: "Unified Review / Feedback",
      route: "/feedback-studio · /review-room",
      ownerStatus: "Not visually certified on phone",
      surfaces: "utility-card / review tools",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 16,
      screen: "Final Approval",
      route: "Review / Final surfaces",
      ownerStatus: "Not visually certified on phone",
      surfaces: "Approve control + status",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 17,
      screen: "Delivery / Download",
      route: "/deliverables",
      ownerStatus: "Not visually certified on phone",
      surfaces: "Deliverable cards",
      proposedCategory: "standard-light",
      normalizeAfterReview: true,
    },
    {
      order: 18,
      screen: "Help Center",
      route: "/help-center + Conversation Room overlay",
      ownerStatus: "Content locked; phone glass remap exists",
      surfaces: "utility-card / help panel",
      proposedCategory: "standard-dense",
      normalizeAfterReview: true,
    },
  ] as const;

export const studioCustomerTileSamsungCheckpointsV1 = [
  {
    id: "A-conversation-room",
    after: "Normalize Review Together, Step 3, Checkout, Intake to shared tiles",
    includes: "Voice Choice through Intake — frozen Step 2 compared, not restyled",
  },
  {
    id: "B-account",
    after: "Normalize Account Handoff / Sign In / Sign Up",
    includes: "Dense form tiles + Denim primary / secondary actions",
  },
  {
    id: "C-board",
    after: "Normalize Board, materials, communication/status",
    includes: "Selected/active only where a card is actually selected",
  },
  {
    id: "D-review-delivery",
    after: "Normalize Review, approval, Delivery",
    includes: "Same family; do not invent operational-dashboard glass",
  },
] as const;

export const studioTileClass = studioCustomerTileSystemV1.classNames;

/** Voice Choice reuses the Let’s Get Started Welcome CTA. */
export function voiceChoiceButtonClass(_selected: boolean): string {
  return studioTileClass.primaryAction;
}
