/**
 * Studio Review → Voice Tablet Migration Ledger — LOCKED contract.
 *
 * Source of truth for Scout: one row per Studio Review journey page/function.
 * Update this file on every Voice-tablet package. Remove Studio Review entries
 * only when status === "removed" after all gates pass.
 *
 * @see docs/studio-review-to-voice-tablet-migration-v1-locked.md
 * @see AGENTS.md → Studio Review Migration
 */

export type StudioReviewMigrationStatus =
  | "not_started"
  | "in_progress"
  | "gates_pending"
  | "ready_to_remove"
  | "removed";

export type StudioReviewMigrationGate =
  | "pending"
  | "verified"
  | "not_applicable"
  | "certified"
  | "received"
  | "done";

export type StudioReviewMigrationRow = {
  /** Stable ledger id (usually matches ownerQa journey preset id). */
  id: string;
  /** Existing Studio Review page / Owner QA label. */
  source: string;
  /** Owner QA preset id when applicable. */
  ownerQaPresetId: string | null;
  /** Current Studio Review href (null after removal). */
  sourceHref: string | null;
  /** Where Voice performs the work on the tablet. */
  tabletReplacement: string;
  /** What the customer sees on Presentation Display. */
  presentationView: string;
  /** Where answers and selections are stored. */
  dataMapping: string;
  status: StudioReviewMigrationStatus;
  persistence: StudioReviewMigrationGate;
  editing: StudioReviewMigrationGate;
  attribution: StudioReviewMigrationGate;
  tests: StudioReviewMigrationGate;
  desktop: StudioReviewMigrationGate;
  mobile: StudioReviewMigrationGate;
  ownerApproval: StudioReviewMigrationGate;
  /** Original page removed only after all gates pass. */
  removal: StudioReviewMigrationGate;
  notes?: string;
};

/**
 * Customer-journey Studio Review pages → Voice tablet migration ledger.
 * Order ≈ migration priority (Lobby already has customer surface; Conversation Room is destination shell).
 */
export const studioReviewVoiceTabletMigrationLedger: readonly StudioReviewMigrationRow[] = [
  {
    id: "discovery",
    source: "Project Discovery (Discovery Room)",
    ownerQaPresetId: null,
    sourceHref: "/business-discovery-studio",
    tabletReplacement:
      "Voice tablet — Discovery rhythm stage (`DiscoveryTabletPanel` in Conversation Room Workspace)",
    presentationView:
      "Presentation Display — discovery surface (current question + captured summaries)",
    dataMapping:
      "working_draft.slices.discoveryAnswers + deadlineInformation + materialsStatus (+ attribution); legacy business-discovery-answers bridged during migration",
    status: "in_progress",
    persistence: "pending",
    editing: "pending",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "in_progress — Discovery conversation interface: Question → Answer → Got it → Next Question. Live Q1+Q2 on Presentation (Speak / Type only); tablet is Studio follow-only; no driver/mode chrome for the customer. Do not remove Studio Review / quarantined Discovery Room until entire Discovery migration is certified.",
  },
  {
    id: "studio-lobby",
    source: "Studio Lobby",
    ownerQaPresetId: "studio-lobby",
    sourceHref: "/studio-lobby",
    tabletReplacement:
      "Customer Lobby remains the entrance; Voice resumes Conversation Room from Lobby return (session + working draft).",
    presentationView: "Studio Lobby customer surface (locked)",
    dataMapping: "studioLobbyVisited + studioConversationSession (phase/step) + working_draft on resume",
    status: "not_started",
    persistence: "pending",
    editing: "not_applicable",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Lobby is not replaced by the tablet; certify Lobby↔Conversation Room round-trip before removing any Lobby QA shortcut.",
  },
  {
    id: "route-map",
    source: "Route Map",
    ownerQaPresetId: "route-map",
    sourceHref: "/route-map",
    tabletReplacement: "Voice tablet — Route Recommendation rhythm stage (Workspace)",
    presentationView: "Presentation Display — route recommendation for the customer",
    dataMapping: "working_draft.slices.routeRecommendation + customerSelectedRoute",
    status: "in_progress",
    persistence: "verified",
    editing: "pending",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): need→route recommendation + confirm CTA on tablet; highways de-emphasized. Host /route-map remains until full cert.",
  },
  {
    id: "project-builder",
    source: "Project Builder",
    ownerQaPresetId: "project-builder",
    sourceHref: "/project-builder?road=i75",
    tabletReplacement:
      "Conversation Room Activity Panel — Build Your Project (`builder` panel; service cards + Review Studio Plan)",
    presentationView:
      "Activity Panel — service list; tablet shows project status + guidance (not duplicate Build Your Project heading)",
    dataMapping:
      "working_draft.slices.customerSelectedRoute + selectedServices (conversation-room-draft)",
    status: "in_progress",
    persistence: "verified",
    editing: "verified",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): decision-help lead + short post-add Voice confirmation; Logo SKU absent (catalog gap documented). Host /project-builder remains until Voice-tablet cert.",
  },
  {
    id: "studio-plan",
    source: "Studio Plan",
    ownerQaPresetId: "studio-plan",
    sourceHref: "/project-builder?road=i75&view=studio-plan",
    tabletReplacement:
      "Conversation Room tablet — Studio Plan orientation + facts; primary Continue to Checkout; secondary Edit Plan",
    presentationView:
      "Tablet glass — key facts; Revisions/materials/scope open extras Activity Panel only",
    dataMapping:
      "working_draft selections → buildProjectBuilderStudioPlanSummary; Continue bridges via bridgeConversationPlanToCampaign → checkout panel",
    status: "in_progress",
    persistence: "verified",
    editing: "verified",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): brief Plan orientation Voice; one primary Continue to Checkout. Host ?view=studio-plan stays.",
  },
  {
    id: "checkout",
    source: "Checkout",
    ownerQaPresetId: "checkout",
    sourceHref: "/checkout",
    tabletReplacement:
      "Tablet status + prep guidance; Activity Panel — SecureCheckoutGrid (single Complete Checkout)",
    presentationView:
      "Activity Panel — total, scope lock note, taxes honesty, Complete Checkout",
    dataMapping:
      "working_draft → bridgeConversationPlanToCampaign → saveApprovedRouteMapPlan → markPaymentReceived → Intake panel",
    status: "in_progress",
    persistence: "verified",
    editing: "pending",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): last-chance-before-lock Voice; success speech only after confirmed payment. Live failure/cancel/retry not invented. Host /checkout stays.",
  },
  {
    id: "project-intake",
    source: "Project Intake",
    ownerQaPresetId: "project-intake",
    sourceHref: "/route-map?step=intake",
    tabletReplacement:
      "Tablet — production status (Completed / Still needed / Next); Activity Panel — multi-service intake",
    presentationView:
      "Activity Panel — shared materials + per-service; tablet production guidance",
    dataMapping:
      "all selectedServiceIds → buildProjectIntakePlan; namespaced answers on campaign intake draft/submit",
    status: "in_progress",
    persistence: "verified",
    editing: "pending",
    attribution: "pending",
    tests: "verified",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): production-framed Intake; materials-later tip; Host intake stays until cert.",
  },
  {
    id: "studio-board",
    source: "Studio Board",
    ownerQaPresetId: "studio-board",
    sourceHref: "/studio-board",
    tabletReplacement:
      "Voice handoff → sign-in (from=/studio-board) → Board arrival welcome",
    presentationView: "Studio Board customer home after auth",
    dataMapping: "purchased project + studio-voice-board-handoff session passport",
    status: "in_progress",
    persistence: "pending",
    editing: "n/a",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
    notes:
      "Guidance Pass v1 (2026-07-19): Voice explains why sign-in; Board welcome once. No auth redesign; no in-app signup.",
  },
  {
    id: "production",
    source: "Production",
    ownerQaPresetId: "production",
    sourceHref: "/studio-board",
    tabletReplacement: "Voice tablet / board — production status (post-purchase)",
    presentationView: "Presentation Display — production status for the customer",
    dataMapping: "purchased project + production job state",
    status: "not_started",
    persistence: "pending",
    editing: "not_applicable",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
  },
  {
    id: "review-room",
    source: "Review Room",
    ownerQaPresetId: "review-room",
    sourceHref: "/feedback-studio",
    tabletReplacement: "Voice tablet — concept review / approvals (post-purchase)",
    presentationView: "Presentation Display — review room for the customer",
    dataMapping: "purchased project + review decisions (+ attribution)",
    status: "not_started",
    persistence: "pending",
    editing: "pending",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
  },
  {
    id: "final-delivery",
    source: "Final Delivery",
    ownerQaPresetId: "final-delivery",
    sourceHref: "/deliverables",
    tabletReplacement: "Voice tablet — final delivery handoff",
    presentationView: "Presentation Display — deliverables for the customer",
    dataMapping: "purchased project + deliverables",
    status: "not_started",
    persistence: "pending",
    editing: "not_applicable",
    attribution: "pending",
    tests: "pending",
    desktop: "pending",
    mobile: "pending",
    ownerApproval: "pending",
    removal: "pending",
  },
] as const;

/** True when every integration gate is stamped and removal is authorized. */
export function isStudioReviewRowReadyToRemove(row: StudioReviewMigrationRow): boolean {
  const stamped = (g: StudioReviewMigrationGate) =>
    g === "verified" || g === "certified" || g === "received" || g === "not_applicable" || g === "done";

  return (
    stamped(row.persistence) &&
    stamped(row.editing) &&
    stamped(row.attribution) &&
    stamped(row.tests) &&
    stamped(row.desktop) &&
    stamped(row.mobile) &&
    stamped(row.ownerApproval) &&
    (row.status === "ready_to_remove" || row.status === "removed")
  );
}

export function getStudioReviewMigrationRow(id: string): StudioReviewMigrationRow | undefined {
  return studioReviewVoiceTabletMigrationLedger.find((row) => row.id === id);
}
