/**
 * Final Delivery Room "Studio Pathway" list for a Clip Repurposing delivery.
 *
 * Current work only: the other canonical launch packages, in canonical order.
 * Prices stay off this panel; the package pages carry commercial truth.
 */

import { getConvertedPackageDetail } from "@/config/studio-customer-journey-condense-v1";

import { listCanonicalLaunchPackages, type CanonicalLaunchPackage } from "./enforcement";

export type CanonicalPathwayService = {
  skuId: CanonicalLaunchPackage["packageId"];
  name: string;
  priceLabel: "";
  definition: string;
  whatItProvides: string;
  howItMayComplement: string;
  availableNow: true;
};

const COMPLEMENT_BESIDE_CLIP: Partial<Record<CanonicalLaunchPackage["packageId"], string>> = {
  short_form_video_editing: "The Studio does not search a long recording for moments.",
  social_and_promo_graphics:
    "No posting, scheduling, or account management. No passwords. No performance guarantee. Designed for digital use, not professional print production.",
  campaign_launch_kit:
    "One fixed campaign: flyer, email, two texts, and square plus portrait graphics. It does not include video.",
};

export const CLIP_DELIVERY_PATHWAY_CLOSING =
  "If you have another longer recording and you want The Studio to search it, that is a new Clip Repurposing order." as const;

export function canonicalClipDeliveryPathwayServices(): readonly CanonicalPathwayService[] {
  return listCanonicalLaunchPackages()
    .filter((pkg) => pkg.packageId !== "clip_repurposing")
    .map((pkg) => {
      const detail = getConvertedPackageDetail(pkg.packageId);
      return {
        skuId: pkg.packageId,
        name: pkg.customerFacingName,
        priceLabel: "" as const,
        definition: detail?.purposeLine ?? "",
        whatItProvides: detail?.sections.find((section) => section.kind === "purpose")?.prose ?? "",
        howItMayComplement: COMPLEMENT_BESIDE_CLIP[pkg.packageId] ?? "",
        availableNow: true as const,
      };
    });
}
