/**
 * $69 Make Me a Flyer — purchase → Review → Final Delivery truth.
 *
 * Frozen catalog labels are not rewritten here. This classifies what each
 * included slot actually is, so customer Review and Final Delivery can tell
 * the truth without inventing new SKU law.
 *
 * Authority already on the SKU:
 * - Route Map: “One single-sided flyer in one size — ready to print or share online.”
 * - FLYER_PROOF_CONTRACT.requiredDeliverableFormats: png + pdf
 * - “One flyer — PDF + digital”
 *
 * Approval of the reviewed creative (PNG of Version N) authorizes coordinated
 * export formats captured from that exact render identity. The print PDF is
 * not a second creative and does not enter a separate Review round. A PDF
 * captured from a different render version is a different identity and must
 * fail closed.
 */

import { FLYER_PROOF_CONTRACT } from "@/lib/studio-design-renderer/contracts";

export const FLYER_SKU_ID = FLYER_PROOF_CONTRACT.skuId;

export type FlyerIncludedSlotClass =
  | "customer_promised_design"
  | "customer_promised_file"
  | "supporting_studio_work"
  | "internal_qa";

export type FlyerIncludedSlotTruth = {
  key: string;
  label: string;
  class: FlyerIncludedSlotClass;
  format?: "png" | "pdf";
  customerFacingExplanation: string;
};

export const FLYER_INCLUDED_SLOT_TRUTH: readonly FlyerIncludedSlotTruth[] = [
  {
    key: "design_direction",
    label: "One defined design direction",
    class: "supporting_studio_work",
    customerFacingExplanation:
      "Studio work that produced the flyer — not a customer download.",
  },
  {
    key: "flyer_design",
    label: "One finished single-sided flyer design — one agreed size only",
    class: "customer_promised_design",
    customerFacingExplanation:
      "The flyer Maya reviews. Approval binds this creative identity.",
  },
  {
    key: "print_ready_pdf",
    label: "Print-ready PDF",
    class: "customer_promised_file",
    format: "pdf",
    customerFacingExplanation:
      "Print file exported from the approved Version N design identity.",
  },
  {
    key: "digital_share_file",
    label: "Digital PNG or JPG version for sharing online (one agreed size)",
    class: "customer_promised_file",
    format: "png",
    customerFacingExplanation:
      "Digital share file of the same approved Version N design identity.",
  },
  {
    key: "qc_review",
    label: "Studio quality-control review before delivery",
    class: "internal_qa",
    customerFacingExplanation:
      "Internal QA before Review — not a customer download.",
  },
] as const;

const SLOTS_BY_LABEL = new Map(
  FLYER_INCLUDED_SLOT_TRUTH.map((slot) => [slot.label, slot]),
);

export function classifyFlyerIncludedSlot(
  label: string,
): FlyerIncludedSlotTruth | null {
  return SLOTS_BY_LABEL.get(label.trim()) ?? null;
}

export function customerReviewDeliverableLabels(
  labels: readonly string[],
): string[] {
  return labels.filter(
    (label) => classifyFlyerIncludedSlot(label)?.class === "customer_promised_design",
  );
}

export function customerPromisedFileLabels(labels: readonly string[]): string[] {
  return labels.filter(
    (label) => classifyFlyerIncludedSlot(label)?.class === "customer_promised_file",
  );
}

export function customerVisiblePurchaseLabels(labels: readonly string[]): string[] {
  return labels.filter((label) => {
    const slot = classifyFlyerIncludedSlot(label);
    return (
      slot?.class === "customer_promised_design" ||
      slot?.class === "customer_promised_file"
    );
  });
}

export function clientDeliveryFileLabelsForSku(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (skuId === FLYER_SKU_ID) {
    const files = customerPromisedFileLabels(labels);
    return files.length > 0 ? files : [...labels];
  }
  if (skuId === "v2-rtu-short-video") {
    const mp4 = labels.filter(
      (label) => /mp4/i.test(label) || /final\s+mp4/i.test(label),
    );
    return mp4.length > 0 ? mp4 : [...labels];
  }
  return [...labels];
}

export function customerVisiblePurchaseLabelsForSku(
  skuId: string,
  labels: readonly string[],
): readonly string[] {
  if (skuId !== FLYER_SKU_ID) return [...labels];
  const visible = customerVisiblePurchaseLabels(labels);
  return visible.length > 0 ? visible : [...labels];
}

export function flyerCoordinatedExportApprovalLaw(): string {
  return [
    `${FLYER_PROOF_CONTRACT.promisedOutput}`,
    FLYER_PROOF_CONTRACT.formatExportRequirements[2],
    "Customer Review binds the creative Version N PNG.",
    "Print PDF is a coordinated export of that same render identity, not a second Review creative.",
  ].join(" ");
}
