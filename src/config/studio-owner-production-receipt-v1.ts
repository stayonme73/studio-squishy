/**
 * Owner desk production receipt.
 * One line on the existing desk. Not a rebuild.
 */

export const studioOwnerProductionReceiptV1 = {
  locked: true as const,
  doNotRebuildOwnerConsole: true as const,
  states: ["RECEIVED", "WORKING", "ISSUE", "COMPLETE"] as const,
  lines: {
    RECEIVED: "Received. Production has your decision.",
    WORKING: "Working. The next packet is in the shop.",
    ISSUE: "Issue. Production is blocked.",
    COMPLETE: "Complete. The packet is coming back to your desk.",
    QUIET: "Quiet. No production packet is open.",
  },
  refreshMustNotPaintWhiteOverLivePacket: true as const,
} as const;
