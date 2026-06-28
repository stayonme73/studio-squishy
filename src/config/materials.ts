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
  requirementLabels: {
    required: "Required",
    optional: "Optional",
  },
  accessInstructionsNote:
    "Access is shared through platform admin tools — passwords are not stored here.",
} as const;

export function materialCategoryLabel(category: MaterialCategory): string {
  return materialsConfig.categoryLabels[category];
}

export function materialStatusLabel(status: MaterialReviewStatus): string {
  return materialsConfig.statusLabels[status];
}
