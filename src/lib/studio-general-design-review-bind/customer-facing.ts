import {
  GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS,
  GENERAL_DESIGN_REVIEW_CUSTOMER_LEAK_PATTERNS,
  studioGeneralDesignReviewBindV1,
} from "@/config/studio-general-design-review-bind-v1";
import type { GeneralDesignReviewMemberId } from "./types";

export function customerFacingReviewTextLeaks(text: string): string | null {
  const hay = String(text ?? "");
  for (const pattern of GENERAL_DESIGN_REVIEW_CUSTOMER_LEAK_PATTERNS) {
    if (pattern.test(hay)) return pattern.source;
  }
  return null;
}

export function customerFormatLabelForMember(
  memberId: GeneralDesignReviewMemberId,
): string {
  switch (memberId) {
    case "square":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.square;
    case "portrait":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.portrait;
    case "front":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.front;
    case "back":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.back;
    case "post-1":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.post(1);
    case "post-2":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.post(2);
    case "post-3":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.post(3);
    case "post-4":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.post(4);
    case "menu":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.menu;
    case "service-sheet":
      return GENERAL_DESIGN_CUSTOMER_FORMAT_LABELS.serviceSheet;
  }
}

export function generalDesignReviewDeliverableKey(
  memberId: GeneralDesignReviewMemberId,
): string {
  return `${studioGeneralDesignReviewBindV1.proofKeyPrefix}:${memberId}`;
}

export function isGeneralDesignReviewDeliverableKey(key: string | undefined): boolean {
  return Boolean(key?.startsWith(`${studioGeneralDesignReviewBindV1.proofKeyPrefix}:`));
}

export function customerProofFilename(input: {
  formatLabel: string;
  renderVersion: number;
}): string {
  const slug = input.formatLabel
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-version-${input.renderVersion}.png`;
}

export function memberIdFromPromoDimensions(
  widthPx: number,
  heightPx: number,
): GeneralDesignReviewMemberId | "landscape-hold" | null {
  if (widthPx === 1024 && heightPx === 1024) return "square";
  if (widthPx === 1024 && heightPx === 1536) return "portrait";
  if (widthPx === 1536 && heightPx === 1024) return "landscape-hold";
  return null;
}
