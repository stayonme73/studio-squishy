/**
 * C8d — Unified Review / Final / Delivery room state (URL + panel chrome).
 *
 * Temporary canonical room: `/feedback-studio`.
 * `/deliverables` redirects into Delivery state.
 * C8d is Delivery State Merge — not an accounting redesign.
 */

export const c8dUnifiedRoomStateV1 = {
  version: 1 as const,
  packageId: "c8d-unified-delivery-state-merge",
  /** Query key on `/feedback-studio`. */
  queryKey: "roomState",
  roomPath: "/feedback-studio",
  legacyDeliverablesPath: "/deliverables",
} as const;

/** Customer-visible room states inside one unified room. */
export type UnifiedRoomStateId = "review" | "final" | "delivery";

export const UNIFIED_ROOM_STATE_IDS = ["review", "final", "delivery"] as const;

export const C8D_ROOM_STATE_COPY = {
  final: {
    pageLead: "Final — the Studio is preparing final delivery for this work.",
    toolsUnavailable:
      "REVIEW TOOLS are not available while the Studio prepares final delivery. You can still message The Studio.",
    workTitle: "Final",
    workLead:
      "This work is approved for final delivery. The Studio is preparing the files you will keep. File downloads appear in Delivery when they are released.",
  },
  delivery: {
    pageLead: "Delivery — truthful final files for this project.",
    toolsUnavailable:
      "REVIEW TOOLS are not used during Delivery. You can download released final files and still message The Studio.",
    workTitle: "Delivery",
  },
  reviewToolsTitle: "REVIEW TOOLS",
} as const;
