/**
 * One current-door Social & Promo Graphics order.
 * Two production capabilities sit behind this job. Neither is a second
 * customer order, a second price, or a second revision ledger.
 */

import type { ServiceId } from "@/catalog/types";
import {
  SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID,
  studioSocialPromoCurrentDoorContractV1,
} from "@/config/studio-social-promo-current-door-contract-v1";
import { buildJobId } from "@/lib/job-control/lane-map";

const CONTRACT = studioSocialPromoCurrentDoorContractV1;

export type SocialPromoCurrentDoorCta =
  | { supplied: false; text: null; treatment: "none" }
  | { supplied: true; text: string; treatment: "customer_words" };

export type SocialPromoRevisionLedger = {
  included: 3;
  used: number;
  remaining: number;
  exhausted: boolean;
  scope: "purchased_package";
};

export type SocialPromoCurrentDoorJob = {
  packageId: typeof SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID;
  jobId: string;
  customerFacingName: typeof CONTRACT.customerFacingName;
  listPriceCents: typeof CONTRACT.listPriceCents;
  thankYouDiscountCents: typeof CONTRACT.thankYouDiscountCents;
  amountDueCents: typeof CONTRACT.amountDueCents;
  revisionRounds: 3;
  revisionLedger: SocialPromoRevisionLedger;
  lane: "standard";
  purpose: string;
  rights: string;
  facts: string | null;
  prices: string | null;
  logoSupplied: boolean;
  photosSupplied: boolean;
  cta: SocialPromoCurrentDoorCta;
  outputs: {
    posts: readonly {
      index: number;
      file: "png";
      width: 1024;
      height: 1024;
      branchId: "social_posts";
    }[];
    captions: readonly { index: number; branchId: "social_posts" }[];
    postingOrder: { count: 1; branchId: "social_posts" };
    campaignGraphics: readonly [
      {
        id: "square";
        file: "png";
        width: 1024;
        height: 1024;
        branchId: "campaign_graphics";
      },
      {
        id: "portrait";
        file: "png";
        width: 1024;
        height: 1536;
        branchId: "campaign_graphics";
      },
    ];
  };
  branches: readonly [
    {
      branchId: "social_posts";
      capabilitySku: "v2-rtu-social-posts";
      customerOrder: false;
    },
    {
      branchId: "campaign_graphics";
      capabilitySku: "v2-rtu-promotion-graphics";
      customerOrder: false;
    },
  ];
  completionLanguage: typeof CONTRACT.completionLanguage;
  productionStarted: false;
  paymentStarted: false;
};

export function socialPromoCurrentDoorJobId(campaignId: string): string {
  return buildJobId(campaignId, SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID as ServiceId);
}

export function socialPromoCtaFromAuthorizedText(ctaText: string): SocialPromoCurrentDoorCta {
  const text = ctaText.trim();
  if (!text) return { supplied: false, text: null, treatment: "none" };
  return { supplied: true, text, treatment: "customer_words" };
}

export function emptySocialPromoRevisionLedger(): SocialPromoRevisionLedger {
  return {
    included: CONTRACT.revisionRounds,
    used: 0,
    remaining: CONTRACT.revisionRounds,
    exhausted: false,
    scope: "purchased_package",
  };
}

export function evaluateSocialPromoRevision(
  ledger: SocialPromoRevisionLedger,
  request: { note: string },
):
  | { ok: true; nextLedger: SocialPromoRevisionLedger }
  | { ok: false; code: "REVISION_EXHAUSTED" | "INVALID_SET_REVISION"; message: string } {
  if (!request.note.trim()) {
    return {
      ok: false,
      code: "INVALID_SET_REVISION",
      message: "A revision round needs the requested change for this Social & Promo Graphics set.",
    };
  }
  if (ledger.remaining <= 0 || ledger.exhausted) {
    return {
      ok: false,
      code: "REVISION_EXHAUSTED",
      message:
        "The three included revision rounds for this Social & Promo Graphics order have been used.",
    };
  }
  const used = ledger.used + 1;
  return {
    ok: true,
    nextLedger: {
      included: 3,
      used,
      remaining: 3 - used,
      exhausted: used >= 3,
      scope: "purchased_package",
    },
  };
}

export function buildSocialPromoCurrentDoorJob(input: {
  campaignId: string;
  purpose: string;
  rights: string;
  ctaText?: string;
  facts?: string;
  prices?: string;
  logoSupplied?: boolean;
  photosSupplied?: boolean;
}):
  | { ok: true; job: SocialPromoCurrentDoorJob }
  | { ok: false; code: "MISSING_REQUIRED_INTAKE"; message: string } {
  const purpose = input.purpose.trim();
  const rights = input.rights.trim();
  const missing: string[] = [];
  if (!purpose) missing.push("offer or campaign theme");
  if (!rights) missing.push("permission to use the supplied materials");
  if (missing.length) {
    return {
      ok: false,
      code: "MISSING_REQUIRED_INTAKE",
      message: `Social & Promo Graphics still needs: ${missing.join(", ")}.`,
    };
  }

  const posts = [1, 2, 3, 4].map((index) => ({
    index,
    file: "png" as const,
    width: 1024 as const,
    height: 1024 as const,
    branchId: "social_posts" as const,
  }));

  return {
    ok: true,
    job: {
      packageId: CONTRACT.packageId,
      jobId: socialPromoCurrentDoorJobId(input.campaignId),
      customerFacingName: CONTRACT.customerFacingName,
      listPriceCents: CONTRACT.listPriceCents,
      thankYouDiscountCents: CONTRACT.thankYouDiscountCents,
      amountDueCents: CONTRACT.amountDueCents,
      revisionRounds: CONTRACT.revisionRounds,
      revisionLedger: emptySocialPromoRevisionLedger(),
      lane: CONTRACT.lane,
      purpose,
      rights,
      facts: input.facts?.trim() || null,
      prices: input.prices?.trim() || null,
      logoSupplied: Boolean(input.logoSupplied),
      photosSupplied: Boolean(input.photosSupplied),
      cta: socialPromoCtaFromAuthorizedText(input.ctaText ?? ""),
      outputs: {
        posts,
        captions: posts.map((post) => ({
          index: post.index,
          branchId: "social_posts" as const,
        })),
        postingOrder: { count: 1 as const, branchId: "social_posts" as const },
        campaignGraphics: [
          {
            id: "square" as const,
            file: "png" as const,
            width: 1024 as const,
            height: 1024 as const,
            branchId: "campaign_graphics" as const,
          },
          {
            id: "portrait" as const,
            file: "png" as const,
            width: 1024 as const,
            height: 1536 as const,
            branchId: "campaign_graphics" as const,
          },
        ],
      },
      branches: [
        {
          branchId: "social_posts",
          capabilitySku: CONTRACT.branches.socialPosts.capabilitySku,
          customerOrder: false,
        },
        {
          branchId: "campaign_graphics",
          capabilitySku: CONTRACT.branches.campaignGraphics.capabilitySku,
          customerOrder: false,
        },
      ],
      completionLanguage: CONTRACT.completionLanguage,
      productionStarted: false,
      paymentStarted: false,
    },
  };
}
