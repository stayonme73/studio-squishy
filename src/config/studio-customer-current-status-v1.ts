/**
 * Room 2 Section 4 — customer-facing current-status overlay.
 * Presentation only. Does not change job spine or campaignStatus machinery.
 *
 * When a purchased service has a live spine, that spine is the current
 * customer state. Coarse campaignStatus remains the journey rail underneath.
 */

export const studioCustomerCurrentStatusV1 = {
  schemaVersion: 1 as const,
  presentationOnly: true as const,

  labels: {
    intakeNeeded: "Waiting on Project Intake",
    intakeReceived: "Project Intake Received",
    producing: "Building Concepts",
    waitingOnYou: "Waiting on you",
    reviewReady: "Ready for Review",
    revisionUnderway: "Revision in progress",
    approvedPreparing: "Approved — preparing files",
    deliveryReady: "Final Delivery ready",
    delivered: "Delivered",
    preparingToStart: "Preparing to start",
  },

  leads: {
    revisionUnderway:
      "The Studio is updating your work from the revision you sent. Review will open again when the new version is ready.",
    approvedPreparing:
      "You approved this version. The Studio is preparing the files you will keep.",
    deliveryReady: "Your approved files are ready to download in Final Delivery.",
    reviewReady: "Open the Review Room to see what is ready and what happens next.",
    waitingOnYou: "The Studio is waiting on you before this service can continue.",
  },

  hints: {
    revisionUnderway: "Nothing is required from you until the revised version is ready.",
    approvedPreparing: "Downloads appear in Final Delivery when the files are ready.",
    waitingOnYou: "Complete the waiting step so The Studio can continue.",
  },

  progressDetails: {
    revisionUnderway: "Revision in progress",
    approvedPreparing: "Preparing files",
    deliveryReady: "Ready to download",
  },

  activity: {
    revisionUnderway: "The Studio is updating your work",
    approvedPreparing: "You approved this version — files are being prepared",
    deliveryReady: "Your deliverables are ready",
    reviewReady: "Your work is ready for review",
  },

  cta: {
    openReview: "Open Review Room",
    openFinalDelivery: "Open Final Delivery",
  },
} as const;
