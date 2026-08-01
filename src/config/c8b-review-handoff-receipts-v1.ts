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
    title: "Confirm request changes",
    lead: "Review what will be submitted with this request.",
    actionLabel: "Request changes",
    confirmCta: "Submit request changes",
    cancelCta: "Keep editing",
    emptyNotice: "No feedback notes or section decisions are included yet.",
  },
  confirmApproval: {
    title: "Confirm approval",
    lead: "You are approving the reviewed version for delivery.",
    actionLabel: "Approve for delivery",
    confirmCta: "Submit approval",
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
