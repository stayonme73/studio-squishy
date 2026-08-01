/**
 * ISSUE-ENTRY-1 — Customer Problem Reporting Through Project Communication.
 * Additive copy only — does not touch protected COMM-D4 strings
 * ("Message sent to The Studio." / "The Studio has not replied yet.").
 * Truthful only: no ticket, SLA, assignment, escalation, or human-review claims.
 */
export const PROJECT_COMMUNICATION_PROBLEM_REPORT_V1 = {
  intentLegend: "What would you like to do?",
  intentQuestionLabel: "Ask a question",
  intentProblemLabel: "Report a problem",

  problemComposerLabel: "Describe the problem",
  problemComposerPlaceholder: "Describe the problem with this project in plain text.",
  problemSubmitLabel: "Send problem report",
  problemSubmitBusyLabel: "Sending…",

  /** System-receipt only. Never implies a person has read it or that review has begun. */
  problemConfirmation: "Received by the Studio system.",
  problemSendFailedFallback: "Could not send the problem report.",
  problemStatusLoadFailedFallback: "Could not load problem report status.",

  problemStatusHeading: "Problem report status",
  problemReturnHint: "You can still send an ordinary message to The Studio at any time.",
} as const;
