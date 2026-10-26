/**
 * Customer life + communication spine.
 * Authority: STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1
 *
 * Board remains the main customer truth surface. Studio Voice may explain
 * customer-safe facts from the Machine record. It must not invent them.
 */

export const studioCustomerLifeV1 = {
  packageId: "STUDIO-OPERATING-FULL-CUSTOMER-LIFE-AND-COMMUNICATION-1",
  schemaVersion: 1 as const,
  routineOwnerAction: "NONE" as const,

  customerCopy: {
    noProjectYet:
      "I do not have a saved Studio project to look up yet. Once your plan is saved or payment is confirmed, I can answer from the Studio record.",
    unknownFromRecord:
      "I do not have that on the project record yet, so I will not guess. Your Studio Board is the main place to see the current honest step.",
    unknownFromRecordPrePay:
      "I do not have that on the project record yet, so I will not guess. We can keep building your plan here, or I can answer from the services The Studio currently offers.",
    paymentConfirmed:
      "Yes. Payment is confirmed on the Studio record. You do not need to pay again.",
    paymentNotConfirmed:
      "The Studio record does not show a confirmed payment yet. If you just tried to pay, wait a moment and ask again, or return to checkout.",
    intakeNeeded:
      "Yes. We still need your Project Intake before we can produce your project.",
    materialsNeeded:
      "Yes. The Studio still needs materials from you before this project can move forward. Uploaded is not the same as approved for use.",
    nothingNeededNow:
      "The Studio record does not show anything waiting on you right now.",
    nothingNeededInLine:
      "No. Nothing is needed from you. Your project is safely in line for a Studio production slot.",
    uploadReceived:
      "Yes. The Studio has the file or material you sent. That means we received it. It does not automatically mean it is approved for use.",
    uploadReceivedPendingUse:
      "Yes. We received your file. It is still being checked for use. Received is not the same as approved for use.",
    uploadApprovedForUse:
      "Yes. We received your file, and the project record shows it is approved for use.",
    uploadNotFound:
      "The Studio record does not show a received upload yet. If you just sent a file, wait a moment and ask again.",
    productionAssigned:
      "Yes. The project record shows production has been assigned.",
    productionNotAssigned:
      "The project record does not show a production assignment yet.",
    qaPassed:
      "Yes. The Studio finished checking your work before Review opened.",
    qaFailed:
      "The Studio is still finishing your work before Review can open.",
    qaNotRecorded:
      "The project record does not show that your work is ready for Review yet. I will not guess.",
    workNotStarted:
      "Production has not started on the Studio record yet. Payment can be confirmed while we are still getting the project ready or waiting on intake.",
    workWaitingForSlot:
      "No. Nobody has started production yet. Your project is safely in line. Nothing else is needed from you. Production will begin when a Studio production slot becomes available. I will not invent a start date.",
    workStarted:
      "Yes. The Studio record shows work has started on your project.",
    recovering:
      "Your payment is confirmed. The Studio is still getting your project ready. This usually finishes on its own. You do not need to pay again.",
    holdingIntake: "Project Intake is what is holding the next step.",
    holdingMaterials: "Required materials are what is holding the next step.",
    holdingRecovery: "The Studio is still finishing setup after payment. That is holding the next internal step, not a new charge.",
    holdingQa: "The Studio is still finishing your work before Review can open.",
    holdingProduction:
      "Work is underway on your project. It is not ready for Review yet.",
    holdingProductionSlot:
      "Nothing is needed from you. Your project is waiting for an available Studio production slot. Production has not started yet. I will not invent a start date.",
    holdingReview: "Nothing on our side is holding it. It is ready for you to review.",
    holdingRevision: "A revision is in progress. The Studio is updating your project.",
    whenStartInLine:
      "Production will begin when a Studio production slot becomes available. I will not invent a start date or a delivery date.",
    whenStartAlreadyStarted:
      "The Studio has already started this work. I will not invent a finish date.",
    reviewNotReady:
      "Review is not open yet. I will not invent a date.",
    reviewReady:
      "You can review it now. Open the Review Room from your Studio Board.",
    changesYes:
      "Yes. You can ask for changes while Review is open, using the revision rounds included with this service.",
    changesNotYet:
      "You can ask for changes once your project is in Review. It is not in Review yet.",
    revisionsLeft: (remaining: number, included: number) =>
      remaining <= 0
        ? `The project record shows no remaining revision rounds of the ${included} included with this service.`
        : `The project record shows ${remaining} revision ${remaining === 1 ? "round" : "rounds"} remaining of ${included} included.`,
    revisionReceived:
      "Yes. The Studio received your revision request. It is on the project record.",
    revisionNotReceived:
      "The Studio record does not show a received revision request yet.",
    newVersionReady:
      "Yes. A revised version is ready for you to look at in Review.",
    newVersionNotReady:
      "A new version is not marked ready on the project record yet.",
    approvedVersionUnknown:
      "The Studio record does not yet show which version you approved.",
    approvedVersion: (versionLabel: string) =>
      `You approved ${versionLabel}. That is the exact version The Studio will prepare for delivery. An older version cannot replace it.`,
    approvedVersionUnlabeled:
      "You approved the version shown in Review. That is the exact version The Studio will prepare for delivery. An older version cannot replace it.",
    finalReady:
      "Your final files are ready in Final Delivery on your Studio Board.",
    finalNotReady:
      "Final files are not released on the project record yet.",
    flyerStatusPrefix: "Here is what the Studio record shows for your project: ",
    /**
     * Coherent project-status answers. Voice names the current state first.
     * Do not concatenate every Machine field.
     */
    statusAwaitingIntake:
      "Payment is confirmed. Project Intake is still needed before we can produce your project.",
    statusAwaitingMaterials:
      "Payment is confirmed. The Studio still needs required materials from you before this project can move forward.",
    statusProductionReady:
      "Your project is set up. The Studio has not opened Review yet.",
    statusWaitingForProductionSlot:
      "Your project is safely in line. Nothing else is needed from you. Production will begin when a Studio production slot becomes available. I will not invent a start date or a delivery date.",
    statusWaitingOnYou:
      "The Studio is waiting on you before this project can continue.",
    statusQaCorrection:
      "The Studio is still finishing your work. Review is not open yet.",
    statusReviewReady:
      "Your project is ready for Review. Open the Review Room from your Studio Board.",
    statusEmailRetryingSecondary:
      "An email notification is still retrying, but Review is available now on your Studio Board. The Board is the source of truth.",
    statusApprovedPreparing:
      "You approved this version. The Studio is preparing your final files from the exact version you approved.",

    materialReceivedAck:
      "We received what you sent. The Studio has recorded it. Uploaded is not the same as approved for use.",
    unusableMaterial:
      "We received the file, but it is not approved for use yet. The Studio still needs a usable version before that material can be used on your project.",
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
  },
} as const;
