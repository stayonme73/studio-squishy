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
    paymentConfirmed:
      "Yes. Payment is confirmed on the Studio record. You do not need to pay again.",
    paymentNotConfirmed:
      "The Studio record does not show a confirmed payment yet. If you just tried to pay, wait a moment and ask again, or return to checkout.",
    intakeNeeded:
      "Yes. We still need your Project Intake before we can produce your flyer.",
    materialsNeeded:
      "Yes. The Studio still needs materials from you before this job can move forward. Uploaded is not the same as approved for use.",
    nothingNeededNow:
      "The Studio record does not show anything waiting on you right now.",
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
      "Yes. Internal quality check is on the record as passed.",
    qaFailed:
      "Internal quality check is on the record, and it has not passed yet.",
    qaNotRecorded:
      "The project record does not show an internal quality check yet. I will not guess.",
    workNotStarted:
      "Production has not started on the Studio record yet. Payment can be confirmed while we are still getting the project ready or waiting on intake.",
    workStarted:
      "Yes. The Studio record shows work has started on your flyer.",
    recovering:
      "Your payment is confirmed. The Studio is still getting your project ready. This usually finishes on its own. You do not need to pay again.",
    holdingIntake: "Project Intake is what is holding the next step.",
    holdingMaterials: "Required materials are what is holding the next step.",
    holdingRecovery: "The Studio is still finishing setup after payment. That is holding the next internal step, not a new charge.",
    holdingQa: "The flyer is still in internal quality check before Review can open.",
    holdingProduction:
      "Work is underway on your flyer. It is not ready for Review yet.",
    holdingReview: "Nothing on our side is holding it. It is ready for you to review.",
    holdingRevision: "A revision is in progress. The Studio is updating the flyer.",
    reviewNotReady:
      "Review is not open yet. The Studio is still preparing your flyer. I will not invent a date.",
    reviewReady:
      "You can review it now. Open the Review Room from your Studio Board.",
    changesYes:
      "Yes. You can ask for changes while Review is open, using the revision rounds included with this service.",
    changesNotYet:
      "You can ask for changes once the flyer is in Review. It is not in Review yet.",
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
      "The Studio record does not yet show an approved version identity.",
    approvedVersion:
      "The approved version is the exact file identity stored on the project record. An older version cannot replace it.",
    finalReady:
      "Your final files are ready in Final Delivery on your Studio Board.",
    finalNotReady:
      "Final files are not released on the project record yet.",
    flyerStatusPrefix: "Here is what the Studio record shows for your flyer: ",
    materialReceivedAck:
      "We received what you sent. The Studio has recorded it. Uploaded is not the same as approved for use.",
    unusableMaterial:
      "We received the file, but it is not approved for use yet. The Studio still needs a usable version before that material can be used on your flyer.",
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
