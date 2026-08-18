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
    pageLead: "Final — Review is complete. The Studio is preparing the files you will keep.",
    toolsUnavailable:
      "Review tools are not available while the Studio prepares your files. You can still message The Studio.",
    workTitle: "Final",
    workLead:
      "This work is approved. The Studio is preparing the files you will keep. Downloads appear in Delivery when they are released.",
  },
  delivery: {
    pageLead: "Delivery — download the files from the version you approved.",
    toolsUnavailable:
      "Review tools are not used during Delivery. You can download released files and still message The Studio.",
    workTitle: "Delivery",
  },
  reviewToolsTitle: "REVIEW TOOLS",
} as const;
