import type {
  MaterialCategory,
  MaterialReviewStatus,
} from "@/lib/materials/types";

/** Internal labels for File Room materials section (Slice 2). */
/** Slice 2c (locked): client missing list consolidates duplicate category slots — one reason per item, not service-by-service rows. */
export const materialsConfig = {
  sectionTitle: "Materials ledger",
  blockingBannerTitle: "Required materials outstanding",
  blockingBannerBody:
    "These items block production for purchased services. Optional items do not block work.",
  emptyTitle: "No material slots",
  emptyBody: "No materials requirements were resolved from the approved Studio Plan.",
  submittedByClientLabel: "Client (Project Details)",
  noSubmissionLabel: "Not yet provided",
  categoryLabels: {
    "logo-brand": "Logo & brand assets",
    "photo-video": "Photography & video",
    "document-reference": "Documents & reference",
    "url-link": "Links & URLs",
    "access-instructions": "Access instructions",
    "factual-confirmation": "Factual confirmations",
    other: "Other",
  } satisfies Record<MaterialCategory, string>,
  statusLabels: {
    missing: "Missing",
    requested: "Requested",
    submitted: "Submitted",
    needs_clarification: "Needs clarification",
    approved_for_use: "Approved for use",
    not_needed: "Not needed",
  } satisfies Record<MaterialReviewStatus, string>,
  /** Client-facing status copy — no internal team notes or staff rationale. */
  clientStatusLabels: {
    missing: "Still needed",
    requested: "Still needed",
    submitted: "Received — under review",
    needs_clarification: "Needs your update",
    approved_for_use: "Approved",
    not_needed: "Not needed",
  } satisfies Record<MaterialReviewStatus, string>,
  clientNeedsClarificationBody:
    "Our team reviewed what you sent and needs an updated version. Please send revised details below.",
  requirementLabels: {
    required: "Required",
    optional: "Optional",
  },
  accessInstructionsNote:
    "Access is shared through platform admin tools — passwords are not stored here.",
  intakePanelTitle: "Materials we still need",
  intakePanelBody:
    "Share a link or a brief description for now. Our team reviews each item before production uses it.",
  intakePanelCompleteTitle: "Materials caught up",
  intakePanelCompleteBody:
    "Required materials are submitted or approved. Optional items stay available under Add more.",
  addMoreLabel: "Add more (optional)",
  clientSubmitLabel: "Send to Studio",
  clientSubmitSuccess: "Submitted — our team will review shortly.",
  teamReviewApproveLabel: "Approve for use",
  teamReviewClarifyLabel: "Request clarification",
  teamReviewNotNeededLabel: "Not needed",
  teamReviewNotePlaceholder: "What should the client clarify or update?",
  clientRequestLabels: {
    "logo-brand:file-metadata": "Logo file",
    "photo-video:file-metadata": "Photo or video file",
    "document-reference:file-metadata": "Document file",
    "document-reference:text": "Document or reference text",
    "url-link:url": "Link or URL",
    "access-instructions:text": "Access instructions",
    "factual-confirmation:confirmation": "Factual confirmation",
    "other:text": "Other material",
  },
  clientRequestPrompts: {
    "logo-brand:file-metadata": "Please send your logo file",
    "photo-video:file-metadata": "Please send your photo or video file",
    "document-reference:file-metadata": "Please send your document file",
    "document-reference:text": "Please share the reference text we need",
    "url-link:url": "Please share the link we need",
    "access-instructions:text": "Describe platform access (no passwords)",
    "factual-confirmation:confirmation": "Please confirm the factual details we need",
    "other:text": "Please share the material we need",
  },
} as const;

export function materialCategoryLabel(category: MaterialCategory): string {
  return materialsConfig.categoryLabels[category];
}

export function materialStatusLabel(status: MaterialReviewStatus): string {
  return materialsConfig.statusLabels[status];
}

export function clientMaterialStatusLabel(status: MaterialReviewStatus): string {
  return materialsConfig.clientStatusLabels[status];
}
