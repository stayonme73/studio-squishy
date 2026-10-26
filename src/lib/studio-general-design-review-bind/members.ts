import type { GeneralDesignReviewMemberId } from "./types";

/** Required Review members for a general-design SKU. Catalog deliverable-N keys are not these. */
export function requiredGeneralDesignReviewMemberIds(
  skuId: string,
): readonly GeneralDesignReviewMemberId[] {
  if (skuId === "v2-rtu-promotion-graphics") return ["square", "portrait"];
  if (skuId === "v2-rtu-social-posts") {
    return ["post-1", "post-2", "post-3", "post-4"];
  }
  if (skuId === "v2-rtu-business-card") return ["front", "back"];
  if (skuId === "v2-rtu-menu") return ["menu"];
  if (skuId === "v2-rtu-service-sheet") return ["service-sheet"];
  return [];
}
