/**
 * Represent one current-door Short-Form order as the product that was sold.
 * Does not render, does not write a second intake, and does not read the
 * historical one-video contract for customer-facing fields.
 */

import { studioShortFormCurrentDoorContractV1 } from "@/config/studio-short-form-current-door-contract-v1";

type CurrentDoorContract = typeof studioShortFormCurrentDoorContractV1;
import {
  emptyPackRevisionLedger,
  evaluatePackRevision,
  type ContentPackRevisionLedger,
  type ContentPackRevisionRequest,
} from "@/lib/studio-short-form-content-pack/revision";

const CONTRACT = studioShortFormCurrentDoorContractV1;

export type ShortFormCurrentDoorSource = {
  slotId: string | null;
  relativePath: string;
  absolutePath: string;
};

export type ShortFormCurrentDoorCta =
  | { supplied: false; text: null; treatment: "none"; endCard: false }
  | { supplied: true; text: string; treatment: "customer_words"; endCard: true };

export type ShortFormCurrentDoorJob = {
  packageId: CurrentDoorContract["packageId"];
  skuId: CurrentDoorContract["skuId"];
  customerFacingName: CurrentDoorContract["customerFacingName"];
  listPriceCents: CurrentDoorContract["listPriceCents"];
  thankYouDiscountCents: CurrentDoorContract["thankYouDiscountCents"];
  amountDueCents: CurrentDoorContract["amountDueCents"];
  revisionRounds: CurrentDoorContract["revisionRounds"];
  sourceCount: number;
  sources: readonly ShortFormCurrentDoorSource[];
  cta: ShortFormCurrentDoorCta;
  mustKeep: string | null;
  outputs: {
    videos: readonly {
      index: number;
      file: "mp4";
      width: 1080;
      height: 1920;
      durationSeconds: "15-30";
      burnedCaptions: true;
      ctaEndCard: boolean;
      tool: "footage_editing_pipeline";
    }[];
    postCaptions: readonly { index: number; tool: "writePackPostCaption" }[];
    coverTitleGraphics: readonly {
      index: number;
      file: "png";
      width: 1080;
      height: 1920;
      eyebrow: CurrentDoorContract["coverEyebrow"];
      tool: "paintPackCover";
    }[];
    postingGuide: {
      count: 1;
      title: CurrentDoorContract["postingGuideTitle"];
      tool: "writePackUseGuide";
    };
  };
  completionLanguage: CurrentDoorContract["completionLanguage"];
  productionStarted: false;
};

export function shortFormCtaFromAuthorizedText(ctaText: string): ShortFormCurrentDoorCta {
  const text = ctaText.trim();
  if (!text) {
    return { supplied: false, text: null, treatment: "none", endCard: false };
  }
  return { supplied: true, text, treatment: "customer_words", endCard: true };
}

export function buildShortFormCurrentDoorJob(input: {
  sources: readonly ShortFormCurrentDoorSource[];
  ctaText: string;
  mustKeepLine?: string;
}): ShortFormCurrentDoorJob {
  const cta = shortFormCtaFromAuthorizedText(input.ctaText);
  const mustKeep = input.mustKeepLine?.trim() || null;
  const videos = input.sources.map((_, index) => ({
    index: index + 1,
    file: "mp4" as const,
    width: CONTRACT.width,
    height: CONTRACT.height,
    durationSeconds: "15-30" as const,
    burnedCaptions: true as const,
    ctaEndCard: cta.endCard,
    tool: CONTRACT.videoTool,
  }));
  return {
    packageId: CONTRACT.packageId,
    skuId: CONTRACT.skuId,
    customerFacingName: CONTRACT.customerFacingName,
    listPriceCents: CONTRACT.listPriceCents,
    thankYouDiscountCents: CONTRACT.thankYouDiscountCents,
    amountDueCents: CONTRACT.amountDueCents,
    revisionRounds: CONTRACT.revisionRounds,
    sourceCount: input.sources.length,
    sources: input.sources,
    cta,
    mustKeep,
    outputs: {
      videos,
      postCaptions: videos.map((video) => ({
        index: video.index,
        tool: CONTRACT.postCaptionTool,
      })),
      coverTitleGraphics: videos.map((video) => ({
        index: video.index,
        file: "png" as const,
        width: CONTRACT.width,
        height: CONTRACT.height,
        eyebrow: CONTRACT.coverEyebrow,
        tool: CONTRACT.coverTool,
      })),
      postingGuide: {
        count: 1 as const,
        title: CONTRACT.postingGuideTitle,
        tool: CONTRACT.postingGuideTool,
      },
    },
    completionLanguage: CONTRACT.completionLanguage,
    productionStarted: false,
  };
}

export function emptyCurrentDoorRevisionLedger(): ContentPackRevisionLedger {
  return {
    ...emptyPackRevisionLedger(),
    included: CONTRACT.revisionRounds,
    remaining: CONTRACT.revisionRounds,
    exhausted: false,
  };
}

export function evaluateCurrentDoorRevision(
  ledger: ContentPackRevisionLedger,
  request: ContentPackRevisionRequest,
):
  | { ok: true; nextLedger: ContentPackRevisionLedger }
  | { ok: false; code: "REVISION_EXHAUSTED" | "INVALID_SET_REVISION"; message: string } {
  const result = evaluatePackRevision(ledger, request);
  if (!result.ok && result.code === "REVISION_EXHAUSTED") {
    return {
      ok: false,
      code: "REVISION_EXHAUSTED",
      message:
        "The three included revision rounds for this Short-Form Video Editing order have been used.",
    };
  }
  return result;
}
