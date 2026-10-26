/**
 * Owner-authorized $349 Short-Form Content Pack definition.
 * Live catalog still sells one short until Owner authorizes the public switch.
 * Does not start Clip Repurposing. Does not change the $349 or $549 prices.
 */

import { clipRepurposingIoFreezeContractV1 } from "@/config/studio-549-clip-repurposing-io-freeze-v1";
import {
  assertProductInputOutputContract,
  type ProductInputOutputContract,
} from "@/config/studio-product-input-output-contract-v1";

export const STUDIO_SHORT_FORM_CONTENT_PACK_PACKAGE_ID =
  "STUDIO-SHORT-FORM-CONTENT-PACK-1" as const;

export const SHORT_FORM_CONTENT_PACK_SKU = "v2-rtu-short-form-video-edit" as const;
export const CLIP_REPURPOSING_BOUNDARY_SKU = "v2-rtu-clip-repurposing" as const;

const SURFACES = {
  productCardShort: true as const,
  checkoutIntakeBeforePayment: true as const,
  helpCenterFull: true as const,
};

export const shortFormContentPackContractV1: ProductInputOutputContract = {
  skuId: SHORT_FORM_CONTENT_PACK_SKU,
  customerFacingName: "Short-Form Content Pack",
  priceCents: 34900,
  youProvide: [
    "Up to 3 short-form source clips, or each desired clip clearly marked as a source segment of 45 seconds or less.",
    "Your CTA.",
    "Any required facts, offers, names, dates, links, or brand assets.",
    "Rights-cleared footage and assets.",
  ],
  studioDelivers: [
    "Up to 3 polished short-form videos.",
    "Captions.",
    "Music where appropriate.",
    "Relevant B-roll where appropriate.",
    "Clean pacing and cuts.",
    "Audio finish.",
    "CTA and end treatment.",
    "3 matching post captions.",
    "3 cover or title graphics.",
    "1 simple posting and use guide.",
    "1 revision round for the set.",
  ],
  whatsIncluded: [
    "A ready-to-use mini content set from the clips or segments you mark.",
    "A short Studio lookaround, up to 4 minutes total surrounding your mark, only to find a clean opening, a complete ending, and the intended spoken thought. This is not permission to send unmarked four-minute clips.",
    "The finish already proven on the flagship short: captions, music when it helps, story-matched B-roll when it helps, pacing, audio finish, and a Studio ending.",
    "Posting copy, covers, and a short use guide for the set.",
  ],
  whatsNotIncluded: [
    "Searching an entire long recording, hunting for the best moments, ranking candidate clips, or extracting from an unmarked long-form source. That is Clip Repurposing.",
    "Three finished videos are not guaranteed if the marked material cannot produce three clean, complete standalone shorts. The Studio will not create weak filler just to reach a number.",
    "Email or SMS campaigns.",
    "The Studio posting for you.",
    "Custom illustration, custom photography, or a new photoshoot for cover graphics.",
  ],
  important:
    "You point to each moment. Mark each clip, or mark a source segment of 45 seconds or less. The Studio may look around that mark, up to 4 minutes total surrounding your mark, only to make the edit clean. This is not long-form discovery. If you want The Studio to search a longer recording and find the moments for you, that is Clip Repurposing.",
  surfaces: SURFACES,
};

export const clipRepurposingBoundaryContractV1: ProductInputOutputContract =
  clipRepurposingIoFreezeContractV1;

export const studioShortFormContentPackV1 = {
  packageId: STUDIO_SHORT_FORM_CONTENT_PACK_PACKAGE_ID,
  authorizedAt: "2026-09-27" as const,
  definitionComplete: true as const,
  factoryAuthorized: true as const,
  factoryBuiltAwaitingOwnerWatch: true as const,
  publicCatalogSwitched: true as const,
  liveFulfillmentStillOneShortUntilPublicSwitch: false as const,
  publicPriceCentsUnchanged: 34900 as const,
  clipPriceCentsUnchanged: 54900 as const,
  doNotStartClipFromThisDefinition: true as const,
  doNotChangeMenuHierarchy: true as const,
  doNotBundleEmailOrSms: true as const,
  packContract: shortFormContentPackContractV1,
  clipBoundaryContract: clipRepurposingBoundaryContractV1,
  stampDoc:
    "docs/launch/studio-flagship-short-form-video-editing-market-alignment-1/SHORT-FORM-CONTENT-PACK-DEFINITION.md" as const,
} as const;

export function contentPackContractFindings(): string[] {
  return [
    ...assertProductInputOutputContract(shortFormContentPackContractV1),
    ...assertProductInputOutputContract(clipRepurposingBoundaryContractV1),
  ];
}
