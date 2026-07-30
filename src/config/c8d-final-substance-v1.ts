/**
 * C8d — Final-state customer substance copy (neutral + authoritative labels).
 * Does not invent files, dates, completion, or release status.
 */

export const c8dFinalSubstanceV1 = {
  version: 1 as const,
  packageId: "c8d-unified-delivery-state-merge",
  headings: {
    fallback: "Final",
    loading: "Final",
  },
  status: {
    loading: "Loading the current Final status for this project.",
    unavailable: "Final status is not available right now.",
    preparingGeneric:
      "Approved work is with The Studio for final preparation. Released download files are not confirmed yet.",
  },
  workReference: {
    label: "Work in Final",
    none: "No specific work item is selected for Final right now.",
    requestedUnavailable:
      "The requested work item is not available for Final right now. Showing project-level Final status.",
    versionUnavailable: "No version label is available for this work.",
  },
  customerAction: {
    noneRequired: "No action required right now.",
    actionRequired: "Customer action required.",
    neutral: "Check Project Communication for any request from the Studio.",
  },
  whatHappensNext: {
    label: "What happens next",
    body: "When The Studio releases final files, they appear in Delivery. Until then, downloads are not available here.",
  },
  deliveryAvailability: {
    label: "Delivery availability",
    loading: "Checking whether released files are available…",
    /** Campaign-level (no focused job). */
    campaignPreparing: "Delivery files are not yet released.",
    campaignAvailable: "Released project files are available in Delivery.",
    campaignUnavailable: "No released files are available.",
    /** Focused-job language. */
    focusedPreparing: "Delivery files for this work are not yet released.",
    focusedAvailable: "Released files for this work are available in Delivery.",
    focusedOtherAvailable:
      "Other project files are available in Delivery. Files for this work are not yet released.",
    error: "Delivery status could not be loaded right now.",
  },
  openDelivery: {
    available: "Open Delivery",
    preparing: "View Delivery status",
    unavailable: "View Delivery status",
    error: "View Delivery status",
    loading: "Checking Delivery…",
  },
} as const;
