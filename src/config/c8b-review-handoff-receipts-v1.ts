/**
 * C8b — customer-facing receipt / confirmation copy for Job Review handoff.
 * Presentation only; does not invent stage authority.
 */

export const c8bReviewHandoffReceiptsV1 = {
  submissionReceipt: {
    label: "Studio submission",
    versionFallback: "Version label not provided",
    timeFallback: "Submission time not available",
    actorFallback: "Studio team",
  },
  handoffChain: {
    label: "Handoff status",
    currentPrefix: "Current",
  },
  confirmRevision: {
    title: "Confirm revision request",
    lead: (versionLabel: string) =>
      `You are requesting a revision of ${versionLabel}. This uses one included revision round.`,
    actionLabel: "Request a revision",
    confirmCta: "Send revision request",
    cancelCta: "Keep reviewing",
    emptyNotice: "No notes or section change marks are included yet.",
  },
  confirmApproval: {
    title: "Confirm approval",
    lead: (versionLabel: string) =>
      `You are approving ${versionLabel}. This is the version The Studio will prepare for delivery.`,
    actionLabel: "Approve this version",
    confirmCta: "Yes, approve this version",
    cancelCta: "Keep reviewing",
  },
  lockedPackage: {
    title: "Locked feedback package",
    immutableNotice: "This package is locked. It cannot be edited or submitted again.",
  },
  inventory: {
    stickyNotes: (count: number) =>
      count === 1 ? "1 sticky note" : `${count} sticky notes`,
    drawings: (count: number) =>
      count === 1 ? "1 marked section" : `${count} marked sections`,
    voiceNotes: (count: number) =>
      count === 1 ? "1 voice note" : `${count} voice notes`,
    writtenComments: (count: number) =>
      count === 1 ? "1 written comment" : `${count} written comments`,
    sectionDecisions: (count: number) =>
      count === 1 ? "1 section decision" : `${count} section decisions`,
  },
} as const;
