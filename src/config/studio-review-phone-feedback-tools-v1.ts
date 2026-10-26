/**
 * PHONE REVIEW FEEDBACK — FINAL SIMPLIFICATION
 *
 * Request a Change: type (default), optional Draw, optional Voice, then Send.
 * Sticky Note is gone from the phone customer UI. Typing is not a named tool.
 */

export const studioReviewPhoneFeedbackToolsV1 = {
  packageId: "STUDIO-OPERATING-REVIEW-ROOM-PHONE-FEEDBACK-TOOLS-1",
  schemaVersion: 3 as const,
  room: 4 as const,
  phoneOnly: true as const,
  doNotMerge: true as const,
  doNotPush: true as const,
  doNotRemintMaya: true as const,
  doNotConsumeMayaRevision: true as const,
  doNotTouchProduction: true as const,
  doNotTouchRevisionAccounting: true as const,
  doNotTouchReviewAuthorization: true as const,
  currentProofIsTheTarget: true as const,
  typingIsDefault: true as const,
  removeStickyNote: true as const,
  removeHighlight: true as const,
  primaryActions: ["Approve", "Request a Change", "Ask The Studio"] as const,
  changeTools: ["Draw on proof", "Voice feedback"] as const,
  eraseAppearsAfterDrawing: true as const,
  oneEraserClearsNoteAndWriting: true as const,
} as const;
