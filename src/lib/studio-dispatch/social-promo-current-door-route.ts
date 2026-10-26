/**
 * Route one Social & Promo Graphics order onto the two existing design
 * capabilities. Resolves their production contracts. Does not render,
 * charge, or open a second Machine.
 */

import type { ServiceId } from "@/catalog/types";
import { studioSocialPromoCurrentDoorContractV1 } from "@/config/studio-social-promo-current-door-contract-v1";
import { resolveControlLaneForSku } from "@/lib/job-control/lane-map";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import type { SocialPromoCurrentDoorJob } from "./social-promo-current-door-job";

const CONTRACT = studioSocialPromoCurrentDoorContractV1;

export type SocialPromoCapabilityBranch = {
  branchId: "social_posts" | "campaign_graphics";
  capabilitySku: "v2-rtu-social-posts" | "v2-rtu-promotion-graphics";
  role: "production_capability";
  family: "social" | "marketing_assets";
  catalogFamilyId: "social_media" | "marketing_assets";
  lane: "standard";
  toolId: "studio_design_renderer";
  readiness: "contract_ready";
  customerOrder: false;
};

export type SocialPromoExecutionPlan = {
  state: "CONTRACT_READY_NOT_STARTED";
  packageJobId: string;
  packageId: "social_and_promo_graphics";
  customerFacingName: "Social & Promo Graphics";
  lane: "standard";
  customerOrderCount: 1;
  revisionLedgerCount: 1;
  revisionRounds: 3;
  listPriceCents: 19900;
  thankYouDiscountCents: number;
  amountDueCents: number;
  paymentStarted: false;
  productionStarted: false;
  branches: readonly [SocialPromoCapabilityBranch, SocialPromoCapabilityBranch];
};

function requireBranch(input: {
  branchId: SocialPromoCapabilityBranch["branchId"];
  capabilitySku: SocialPromoCapabilityBranch["capabilitySku"];
  family: SocialPromoCapabilityBranch["family"];
  catalogFamilyId: SocialPromoCapabilityBranch["catalogFamilyId"];
}): { ok: true; branch: SocialPromoCapabilityBranch } | { ok: false; message: string } {
  const resolved = resolveServiceProductionContract(input.capabilitySku);
  if (resolved.status !== "resolved") {
    return {
      ok: false,
      message: `${input.branchId} capability ${input.capabilitySku} is not resolved (${resolved.status}).`,
    };
  }
  const contract = resolved.contract;
  const lane = resolveControlLaneForSku(input.capabilitySku as ServiceId);
  if (contract.readiness !== "contract_ready") {
    return {
      ok: false,
      message: `${input.capabilitySku} readiness is ${contract.readiness}.`,
    };
  }
  if (contract.primaryTool.toolId !== "studio_design_renderer") {
    return {
      ok: false,
      message: `${input.capabilitySku} tool is ${contract.primaryTool.toolId}.`,
    };
  }
  if (contract.productionFamilyId !== input.family) {
    return {
      ok: false,
      message: `${input.capabilitySku} family is ${contract.productionFamilyId}.`,
    };
  }
  if (contract.catalogFamilyId !== input.catalogFamilyId) {
    return {
      ok: false,
      message: `${input.capabilitySku} catalog family is ${contract.catalogFamilyId}.`,
    };
  }
  if (lane !== "standard") {
    return { ok: false, message: `${input.capabilitySku} lane is ${lane}.` };
  }
  return {
    ok: true,
    branch: {
      branchId: input.branchId,
      capabilitySku: input.capabilitySku,
      role: "production_capability",
      family: input.family,
      catalogFamilyId: input.catalogFamilyId,
      lane: "standard",
      toolId: "studio_design_renderer",
      readiness: "contract_ready",
      customerOrder: false,
    },
  };
}

export function planSocialPromoCurrentDoorExecution(
  job: SocialPromoCurrentDoorJob,
): { ok: true; plan: SocialPromoExecutionPlan } | { ok: false; message: string } {
  if (job.packageId !== CONTRACT.packageId) {
    return { ok: false, message: "This plan only covers Social & Promo Graphics." };
  }
  if (job.branches.length !== 2) {
    return { ok: false, message: "The current package needs both production capabilities." };
  }

  const social = requireBranch({
    branchId: "social_posts",
    capabilitySku: CONTRACT.branches.socialPosts.capabilitySku,
    family: CONTRACT.branches.socialPosts.family,
    catalogFamilyId: CONTRACT.branches.socialPosts.catalogFamilyId,
  });
  if (!social.ok) return social;

  const graphics = requireBranch({
    branchId: "campaign_graphics",
    capabilitySku: CONTRACT.branches.campaignGraphics.capabilitySku,
    family: CONTRACT.branches.campaignGraphics.family,
    catalogFamilyId: CONTRACT.branches.campaignGraphics.catalogFamilyId,
  });
  if (!graphics.ok) return graphics;

  return {
    ok: true,
    plan: {
      state: "CONTRACT_READY_NOT_STARTED",
      packageJobId: job.jobId,
      packageId: job.packageId,
      customerFacingName: job.customerFacingName,
      lane: "standard",
      customerOrderCount: 1,
      revisionLedgerCount: 1,
      revisionRounds: job.revisionRounds,
      listPriceCents: job.listPriceCents,
      thankYouDiscountCents: job.thankYouDiscountCents,
      amountDueCents: job.amountDueCents,
      paymentStarted: false,
      productionStarted: false,
      branches: [social.branch, graphics.branch],
    },
  };
}
