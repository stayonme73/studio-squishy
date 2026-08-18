/**
 * Review + Revision full loop — Room 1 Customer Life + Communication.
 * Authority: STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1
 *
 * Production → QA → Review → revision → QA → re-review → exact approval → Final Delivery.
 * Renderer success is not customer-ready. In-app / Board / Voice is enough — no lifecycle email.
 */

export const studioReviewRevisionFullLoopV1 = {
  packageId: "STUDIO-OPERATING-REVIEW-REVISION-FULL-LOOP-1",
  schemaVersion: 1 as const,
  room: 1 as const,
  routineOwnerAction: "NONE" as const,
  customerFacingName: "Review Room",
  serviceName: "Make Me a Flyer",
  skuId: "v2-rtu-flyer",
  includedCorrectionRounds: 1,
  deliverableKey: "deliverable-0",
  /** Frozen plan lists five slots; only PNG + PDF are customer files. See flyer-purchase-delivery-truth. */
  customerPromisedFiles: ["print_ready_pdf", "digital_share_file"] as const,

  customerCopy: {
    currentVersionLead: (versionLabel: string) =>
      `You are reviewing ${versionLabel}. This is the current version on the project record.`,
    approvedVersionLead: (versionLabel: string) =>
      `You approved ${versionLabel}. This is the version on the project record.`,
    currentReviewVersion: (versionLabel: string) =>
      `You are looking at ${versionLabel}, the current version on the project record.`,
    currentReviewVersionUnknown:
      "The project record does not yet show a current Review version, so I will not guess.",
    revisionApplied:
      "Yes. The Studio record shows your requested change was applied in the current version.",
    revisionReceivedNotReady:
      "Yes. The Studio received your revision request. A new version is not ready on the record yet.",
    revisionChangeUnknown:
      "The Studio record does not show a requested change applied yet, so I will not guess.",
    submittedApproval:
      "Approved. The Studio is preparing your final files from the exact version you approved.",
    reviewProofAlt: (businessName: string, versionLabel: string) =>
      `${businessName} flyer, ${versionLabel}.`,
    proofRefsLabel: "Versions of this work",
    readyForReviewQuestion: "Is my flyer ready for me to review?",
    didYouMakeMyChange: "Did you make my requested change?",
    whichVersionAmILookingAt: "Which version am I looking at?",
  },
} as const;

export type MachineFlyerRevisionEmphasis = {
  packageId: typeof studioReviewRevisionFullLoopV1.packageId;
  instruction: string;
  emphasizeExistingCtaAsHeadline: boolean;
  sourceRevisionPackageId: string;
  priorWorkVersionId: string | null;
  recordedAt: string;
};
