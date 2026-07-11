/**
 * Project Record Squishy — deterministic intent matching and grounded answers.
 * Pure resolver only. Squishy explains and guides; Block A APIs submit on customer confirm.
 */

import type { RequestTargetKey } from "@/lib/customer-field-tokens";
import type { SquishyMessage } from "@/lib/squishy/types";

export type MaterialUiKey = "logo_material" | "photo_material" | "document_material" | "reference_url";

export type ProjectRecordIntentKey =
  | "project_status"
  | "revision_count"
  | "upload_logo"
  | "upload_photo"
  | "upload_document"
  | "upload_reference"
  | "upload_file"
  | "change_primary_approver_email"
  | "change_primary_approver_name"
  | "change_secondary_approver_email"
  | "change_secondary_approver_name"
  | "change_destination_url"
  | "change_social_links"
  | "change_email_sender"
  | "change_email_platform"
  | "change_phone"
  | "change_contact"
  | "change_business_hours"
  | "add_note"
  | "scope_change"
  | "unknown";

export type ProjectRecordIntentMatch = {
  intent: ProjectRecordIntentKey;
  targetKey?: RequestTargetKey;
  materialKey?: MaterialUiKey;
  requiresStudioReview?: boolean;
};

export type ProjectRecordSquishySnapshot = {
  paymentReceivedAt: string | null;
  justArrived: boolean;
  hasGreeted: boolean;
  campaignStatusLabel: string;
  pendingRequestCount: number;
  revisionDataReady: boolean;
  revisionIncluded: number;
  revisionUsed: number;
  revisionRemaining: number;
  projectStatusReady: boolean;
  projectStatusError: boolean;
  blockingMaterialsCount: number;
  waitingOnClientJobCount: number;
  jobStatusLabels: readonly string[];
  requestJustConfirmed?: boolean;
};

export type SquishyProjectRecordMessageKey =
  | "first-paid-visit"
  | "request-received-confirmed"
  | "materials-blocking"
  | "waiting-on-client";

export const SQUISHY_PROJECT_RECORD_COPY: Record<SquishyProjectRecordMessageKey, string> = {
  "first-paid-visit":
    "Your project is confirmed. Ask me about your status, revisions, or a lightweight information update.",
  "request-received-confirmed":
    "Your request was received. Check Project Activity below for the timestamp and details.",
  "materials-blocking":
    "We still need materials from you before production can continue. Use the materials section or ask me about a specific file.",
  "waiting-on-client":
    "The Studio is waiting on you for at least one item. Check Project Status for what is needed next.",
};

export const SQUISHY_PROJECT_RECORD_GROUNDED_COPY = {
  statusPrefix: "Your project is currently",
  revisionSummary: (included: number, used: number, remaining: number) =>
    `Your plan includes ${included} revision round${included === 1 ? "" : "s"}. You have used ${used} and have ${remaining} remaining.`,
  jobStatusLead: "Here is the latest status for your services:",
  materialsLead:
    "File updates go through the materials form so our team can review them. Tell me which file you are updating and I will open that path.",
  scopeChange:
    "That kind of change may affect your services, deliverables, price, or schedule. I can submit it for Studio review, but it will not be applied automatically.",
  unknown:
    "I can help with project status, revisions, file materials, or a lightweight information update. What would you like to do?",
  reviewLead: "Here is the request I will submit after you confirm:",
  reviewDisclaimer:
    "Nothing is applied until The Studio reviews and confirms this request.",
  confirmPrompt: "Confirm this request to send it to The Studio.",
  clarifyValue: (label: string) => `What would you like your new ${label.toLowerCase()} to be?`,
  clarifyScopeDetail: "Please describe the change you would like The Studio to review.",
  clarifyFileType: "Which file are you updating — logo, photo, document, or reference URL?",
  requestReceived: "Request received.",
  submittedAwaitingActivity:
    "Your request was submitted to The Studio. Check Project Activity below for confirmation when it appears.",
  nothingSubmitted: "Nothing was submitted.",
  statusUnavailable:
    "I cannot confirm your project status right now. Check Project Status on this page or try again shortly.",
  revisionUnavailable:
    "I cannot confirm your revision allowance right now. Check the Revision Tracker on this page.",
  materialsHandoff: (label: string) =>
    `Use the materials form below to send your ${label.toLowerCase()}. Our team will review it and Project Activity will update when it is received.`,
} as const;

const SCOPE_CHANGE_PATTERNS = [
  /\badd\b.*\bservice\b/i,
  /\bremove\b.*\bservice\b/i,
  /\bmore\s+posts?\b/i,
  /\bextra\b/i,
  /\brefund\b/i,
  /\bcheaper\b/i,
  /\bdeadline\b/i,
  /\brush\b/i,
  /\bsooner\b/i,
  /\bdeliverable\b/i,
  /\brevision\s+round\b/i,
  /\bchange\s+scope\b/i,
  /\bchange\s+price\b/i,
  /\bpricing\b/i,
  /\bcancel\b/i,
  /\bschedule\b/i,
];

const INTENT_RULES: readonly {
  intent: ProjectRecordIntentKey;
  targetKey?: RequestTargetKey;
  materialKey?: MaterialUiKey;
  patterns: readonly RegExp[];
}[] = [
  {
    intent: "change_primary_approver_email",
    targetKey: "primary_approver_email",
    patterns: [/primary\s+approver\s+email/i, /approver\s+email/i, /change\s+(?:my\s+)?email/i],
  },
  {
    intent: "change_primary_approver_name",
    targetKey: "primary_approver_name",
    patterns: [/primary\s+approver\s+name/i, /approver\s+name/i],
  },
  {
    intent: "change_secondary_approver_email",
    targetKey: "secondary_approver_email",
    patterns: [/secondary\s+approver\s+email/i],
  },
  {
    intent: "change_secondary_approver_name",
    targetKey: "secondary_approver_name",
    patterns: [/secondary\s+approver\s+name/i],
  },
  {
    intent: "change_destination_url",
    targetKey: "destination_url",
    patterns: [/destination\s+(?:url|link)/i, /landing\s+(?:page|url)/i, /website\s+url/i],
  },
  {
    intent: "change_social_links",
    targetKey: "social_account_links",
    patterns: [/social\s+(?:account|media|link)/i, /instagram|facebook|linkedin|tiktok/i],
  },
  {
    intent: "change_email_sender",
    targetKey: "email_sender_name",
    patterns: [/sender\s+name/i, /email\s+sender/i, /from\s+name/i],
  },
  {
    intent: "change_email_platform",
    targetKey: "email_platform",
    patterns: [/email\s+platform/i, /mailchimp|klaviyo|constant\s+contact/i],
  },
  {
    intent: "change_phone",
    targetKey: "phone_number",
    patterns: [/phone\s+number/i, /\btelephone\b/i, /\bcall\s+us\b/i],
  },
  {
    intent: "change_contact",
    targetKey: "contact_information",
    patterns: [/contact\s+information/i, /contact\s+details/i],
  },
  {
    intent: "change_business_hours",
    targetKey: "business_hours",
    patterns: [/business\s+hours/i, /opening\s+hours/i, /hours\s+of\s+operation/i],
  },
  {
    intent: "add_note",
    targetKey: "forgotten_note",
    patterns: [/forgot(?:ten)?\s+(?:to\s+)?(?:mention|include|add)/i, /add\s+a\s+note/i],
  },
  {
    intent: "upload_logo",
    materialKey: "logo_material",
    patterns: [/\blogo\b/i],
  },
  {
    intent: "upload_photo",
    materialKey: "photo_material",
    patterns: [/\bphoto\b/i, /\bimage\b/i, /\bpicture\b/i, /video\s+file/i],
  },
  {
    intent: "upload_document",
    materialKey: "document_material",
    patterns: [/\bdocument\b/i, /\bpdf\b/i, /supporting\s+file/i],
  },
  {
    intent: "upload_reference",
    materialKey: "reference_url",
    patterns: [/reference\s+url/i, /reference\s+link/i],
  },
  {
    intent: "upload_file",
    patterns: [/\bupload\b/i, /\bfile\b/i, /\bmaterial\b/i, /send\s+(?:a\s+)?file/i],
  },
  {
    intent: "revision_count",
    patterns: [/revision/i, /rounds?\s+left/i, /rounds?\s+remaining/i],
  },
  {
    intent: "project_status",
    patterns: [
      /project\s+status/i,
      /where\s+(?:is|are)\s+my\s+project/i,
      /what(?:'s|\s+is)\s+(?:the\s+)?status/i,
      /what(?:'s|\s+is)\s+happening/i,
      /\bprogress\b/i,
    ],
  },
];

function squishyMessage(key: string, text: string): SquishyMessage {
  return { key, text };
}

function isScopeChangingUtterance(utterance: string): boolean {
  return SCOPE_CHANGE_PATTERNS.some((pattern) => pattern.test(utterance));
}

export function matchProjectRecordIntent(utterance: string): ProjectRecordIntentMatch {
  const trimmed = utterance.trim();
  if (!trimmed) {
    return { intent: "unknown" };
  }

  if (isScopeChangingUtterance(trimmed)) {
    return { intent: "scope_change", targetKey: "clarification", requiresStudioReview: true };
  }

  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(trimmed))) {
      return {
        intent: rule.intent,
        targetKey: rule.targetKey,
        materialKey: rule.materialKey,
      };
    }
  }

  return { intent: "unknown" };
}

export function intentTargetLabel(match: ProjectRecordIntentMatch): string {
  if (match.materialKey === "logo_material") return "Logo file";
  if (match.materialKey === "photo_material") return "Photo or image";
  if (match.materialKey === "document_material") return "Supporting document";
  if (match.materialKey === "reference_url") return "Reference URL";
  if (match.targetKey === "primary_approver_email") return "Primary approver email";
  if (match.targetKey === "primary_approver_name") return "Primary approver name";
  if (match.targetKey === "secondary_approver_email") return "Secondary approver email";
  if (match.targetKey === "secondary_approver_name") return "Secondary approver name";
  if (match.targetKey === "destination_url") return "Destination URL";
  if (match.targetKey === "social_account_links") return "Social account links";
  if (match.targetKey === "email_sender_name") return "Email sender name";
  if (match.targetKey === "email_platform") return "Email platform";
  if (match.targetKey === "phone_number") return "Phone number";
  if (match.targetKey === "contact_information") return "Contact information";
  if (match.targetKey === "business_hours") return "Business hours";
  if (match.targetKey === "forgotten_note") return "Forgotten note";
  if (match.targetKey === "clarification") return "Clarification";
  return "Request";
}

export function isReadOnlyIntent(intent: ProjectRecordIntentKey): boolean {
  return intent === "project_status" || intent === "revision_count";
}

export function isMaterialIntent(match: ProjectRecordIntentMatch): boolean {
  return Boolean(match.materialKey) || match.intent === "upload_file";
}

export function resolveMaterialKeyFromUtterance(utterance: string): MaterialUiKey | null {
  const match = matchProjectRecordIntent(utterance);
  if (match.materialKey) return match.materialKey;
  if (/\blogo\b/i.test(utterance)) return "logo_material";
  if (/\bphoto\b|\bimage\b|\bpicture\b/i.test(utterance)) return "photo_material";
  if (/\bdocument\b|\bpdf\b/i.test(utterance)) return "document_material";
  if (/reference/i.test(utterance)) return "reference_url";
  return null;
}

/** Extract a likely new value from a change request utterance. */
export function extractRequestedValue(utterance: string): string | null {
  const trimmed = utterance.trim();
  const toMatch = trimmed.match(/\bto\s+(.+)$/i);
  if (toMatch?.[1]) return toMatch[1].trim();

  const isMatch = trimmed.match(/\bis\s+(.+)$/i);
  if (isMatch?.[1] && !/^(the|my|our)\b/i.test(isMatch[1])) return isMatch[1].trim();

  const emailMatch = trimmed.match(/[\w.+-]+@[\w.-]+\.\w+/);
  if (emailMatch) return emailMatch[0];

  const urlMatch = trimmed.match(/https?:\/\/\S+/i);
  if (urlMatch) return urlMatch[0];

  const phoneMatch = trimmed.match(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/);
  if (phoneMatch) return phoneMatch[0];

  return null;
}

export function needsClarifyingValue(match: ProjectRecordIntentMatch, utterance: string): boolean {
  if (isReadOnlyIntent(match.intent) || isMaterialIntent(match)) return false;
  if (match.intent === "scope_change" || match.intent === "unknown") {
    return !utterance.trim() || utterance.trim().split(/\s+/).length < 4;
  }
  if (!match.targetKey) return true;
  return !extractRequestedValue(utterance);
}

export function buildClarifyingQuestion(match: ProjectRecordIntentMatch): string {
  if (match.intent === "scope_change") {
    return SQUISHY_PROJECT_RECORD_GROUNDED_COPY.clarifyScopeDetail;
  }
  if (match.intent === "upload_file" && !match.materialKey) {
    return SQUISHY_PROJECT_RECORD_GROUNDED_COPY.clarifyFileType;
  }
  if (match.intent === "unknown") {
    return SQUISHY_PROJECT_RECORD_GROUNDED_COPY.unknown;
  }
  return SQUISHY_PROJECT_RECORD_GROUNDED_COPY.clarifyValue(intentTargetLabel(match));
}

export type ReviewSummaryFields = {
  targetLabel: string;
  previousValue: string | null;
  requestedValue: string;
  note?: string;
};

export function buildReviewSummaryFields(
  match: ProjectRecordIntentMatch,
  requestedValue: string,
  previousValue: string | null = null,
  note?: string,
): ReviewSummaryFields {
  return {
    targetLabel: intentTargetLabel(match),
    previousValue,
    requestedValue,
    note,
  };
}

export function buildReviewSummary(
  match: ProjectRecordIntentMatch,
  requestedValue: string,
  note?: string,
): SquishyMessage {
  const fields = buildReviewSummaryFields(match, requestedValue, null, note);
  const lines = [
    SQUISHY_PROJECT_RECORD_GROUNDED_COPY.reviewLead,
    `${fields.targetLabel}: ${fields.requestedValue}`,
    note ? `Note: ${note}` : null,
    SQUISHY_PROJECT_RECORD_GROUNDED_COPY.reviewDisclaimer,
    SQUISHY_PROJECT_RECORD_GROUNDED_COPY.confirmPrompt,
  ].filter(Boolean);
  return squishyMessage("review-summary", lines.join(" "));
}

export function validateRequestedValue(
  match: ProjectRecordIntentMatch,
  value: string,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Please provide a value before continuing.";

  if (match.targetKey === "primary_approver_email" || match.targetKey === "secondary_approver_email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Please enter a valid email address.";
    }
  }

  if (match.targetKey === "phone_number") {
    if (!/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(trimmed)) {
      return "Please enter a phone number with at least 10 digits.";
    }
  }

  if (match.targetKey === "destination_url") {
    if (!/^https?:\/\//i.test(trimmed)) {
      return "Please enter a full URL starting with http:// or https://.";
    }
  }

  return null;
}

export function resolveGroundedAnswer(
  snapshot: ProjectRecordSquishySnapshot,
  match: ProjectRecordIntentMatch,
): SquishyMessage | null {
  if (match.intent === "project_status") {
    if (snapshot.projectStatusError) {
      return squishyMessage("status-unavailable", SQUISHY_PROJECT_RECORD_GROUNDED_COPY.statusUnavailable);
    }
    if (!snapshot.projectStatusReady && snapshot.jobStatusLabels.length === 0) {
      return squishyMessage("status-unavailable", SQUISHY_PROJECT_RECORD_GROUNDED_COPY.statusUnavailable);
    }
    const jobLines =
      snapshot.jobStatusLabels.length > 0
        ? ` ${SQUISHY_PROJECT_RECORD_GROUNDED_COPY.jobStatusLead} ${snapshot.jobStatusLabels.join("; ")}.`
        : "";
    return squishyMessage(
      "grounded-status",
      `${SQUISHY_PROJECT_RECORD_GROUNDED_COPY.statusPrefix} ${snapshot.campaignStatusLabel}.${jobLines}`,
    );
  }

  if (match.intent === "revision_count") {
    if (!snapshot.revisionDataReady) {
      return squishyMessage(
        "revision-unavailable",
        SQUISHY_PROJECT_RECORD_GROUNDED_COPY.revisionUnavailable,
      );
    }
    return squishyMessage(
      "grounded-revisions",
      SQUISHY_PROJECT_RECORD_GROUNDED_COPY.revisionSummary(
        snapshot.revisionIncluded,
        snapshot.revisionUsed,
        snapshot.revisionRemaining,
      ),
    );
  }

  if (isMaterialIntent(match)) {
    const label = intentTargetLabel(match);
    return squishyMessage(
      "grounded-materials",
      SQUISHY_PROJECT_RECORD_GROUNDED_COPY.materialsHandoff(label),
    );
  }

  if (match.intent === "scope_change") {
    return squishyMessage("grounded-scope-change", SQUISHY_PROJECT_RECORD_GROUNDED_COPY.scopeChange);
  }

  if (match.intent === "unknown") {
    return squishyMessage("grounded-unknown", SQUISHY_PROJECT_RECORD_GROUNDED_COPY.unknown);
  }

  return null;
}

/**
 * Passive status narration for Project Record — silence is the default.
 */
export function resolveSquishyProjectRecordMessage(
  snapshot: ProjectRecordSquishySnapshot,
): SquishyMessage | null {
  if (!snapshot.paymentReceivedAt) return null;

  if (snapshot.requestJustConfirmed) {
    return squishyMessage(
      "request-received-confirmed",
      SQUISHY_PROJECT_RECORD_COPY["request-received-confirmed"],
    );
  }

  if (snapshot.justArrived && !snapshot.hasGreeted) {
    return squishyMessage("first-paid-visit", SQUISHY_PROJECT_RECORD_COPY["first-paid-visit"]);
  }

  if (snapshot.blockingMaterialsCount > 0 && snapshot.waitingOnClientJobCount > 0) {
    return squishyMessage("waiting-on-client", SQUISHY_PROJECT_RECORD_COPY["waiting-on-client"]);
  }

  if (snapshot.blockingMaterialsCount > 0) {
    return squishyMessage("materials-blocking", SQUISHY_PROJECT_RECORD_COPY["materials-blocking"]);
  }

  if (snapshot.waitingOnClientJobCount > 0) {
    return squishyMessage("waiting-on-client", SQUISHY_PROJECT_RECORD_COPY["waiting-on-client"]);
  }

  return null;
}

export function buildSubmitTarget(
  match: ProjectRecordIntentMatch,
  utterance: string,
): { targetKey: RequestTargetKey; requestedValue: string } | null {
  if (!match.targetKey || isReadOnlyIntent(match.intent) || isMaterialIntent(match)) {
    return null;
  }

  const requestedValue = extractRequestedValue(utterance) ?? utterance.trim();
  if (!requestedValue) return null;

  return { targetKey: match.targetKey, requestedValue };
}
