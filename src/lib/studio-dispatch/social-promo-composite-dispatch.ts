/**
 * One Social & Promo Graphics customer job drives both existing design
 * capabilities. Parent intake is the source of truth. Rendering stays held.
 */

import { createHash } from "crypto";

import type { ServiceId } from "@/catalog/types";
import type { CampaignRecord } from "@/config/studio-board";
import { SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID } from "@/config/studio-social-promo-current-door-contract-v1";
import { studioSocialPromoCurrentDoorContractV1 } from "@/config/studio-social-promo-current-door-contract-v1";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import { blockingMaterialsForSku } from "@/lib/job-control/resolve-jobs";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { readProjectIntakeAnswer } from "@/lib/project-intake-plan";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { evaluateJobRoutingDecision } from "@/lib/studio-routing-handoff/evaluate";
import type { JobRoutingDecision } from "@/lib/studio-routing-handoff/types";

import {
  buildSocialPromoCurrentDoorJob,
  type SocialPromoCurrentDoorJob,
} from "./social-promo-current-door-job";
import type { JobDispatchRecord } from "./types";

const CONTRACT = studioSocialPromoCurrentDoorContractV1;
const PARENT = SOCIAL_PROMO_CURRENT_DOOR_PACKAGE_ID;
const PARENT_SERVICE = PARENT as ServiceId;

export const SOCIAL_PROMO_COMPOSITE_RENDER_HOLD = "social_promo_composite_render_held" as const;

const BRANCHES = [
  CONTRACT.branches.socialPosts,
  CONTRACT.branches.campaignGraphics,
] as const;

export function isSocialPromoCompositeBranchJob(jobId: string): boolean {
  return jobId.includes(`:${PARENT}:branch:`);
}

/**
 * Theme-led copy is assigned per piece, so a copy or layout correction with the
 * same campaign facts is a new render. The set fingerprint alone only covers
 * campaign facts, which would hand back the superseded artwork.
 */
export function themeLedSetFingerprint(
  sharedSpecFingerprint: string,
  assets: readonly unknown[],
): string {
  return createHash("sha256")
    .update(JSON.stringify({ sharedSpecFingerprint, assets }))
    .digest("hex");
}

function readDoor(campaign: CampaignRecord, fieldId: string): string {
  return readProjectIntakeAnswer(
    campaign.routeMapIntake?.answers,
    fieldId,
    PARENT_SERVICE,
  );
}

function parentMaterialsForBranch(
  materials: readonly CampaignMaterialItem[],
  branchSku: ServiceId,
): CampaignMaterialItem[] {
  return materials
    .filter((item) => item.relatedServiceIds.includes(PARENT_SERVICE))
    .map((item) => ({ ...item, relatedServiceIds: [branchSku] }));
}

function branchJob(
  parent: Pick<PurchasedJobRecord, "jobId" | "campaignId" | "intakeComplete" | "ownerApprovalPending">,
  branchId: string,
  capabilitySku: ServiceId,
  intakeComplete: boolean,
): PurchasedJobRecord {
  return {
    jobId: `${parent.jobId}:branch:${branchId}`,
    campaignId: parent.campaignId,
    skuId: capabilitySku,
    serviceName: CONTRACT.customerFacingName,
    spineStatus: "ready_for_queue",
    productionLane: "standard",
    intakeComplete,
    ownerApprovalPending: parent.ownerApprovalPending ?? null,
  } as PurchasedJobRecord;
}

export function socialPromoCompositeRoutingDecisions(input: {
  campaign: CampaignRecord;
  job: Pick<
    PurchasedJobRecord,
    "jobId" | "campaignId" | "skuId" | "intakeComplete" | "ownerApprovalPending"
  >;
  materials: readonly CampaignMaterialItem[];
  evaluatedAt?: string;
}): JobRoutingDecision[] | null {
  if (input.job.skuId !== PARENT_SERVICE) return null;
  const purpose = readDoor(input.campaign, "purpose");
  const rights = readDoor(input.campaign, "rights");
  const intakeComplete = Boolean(input.job.intakeComplete && purpose && rights);
  return BRANCHES.map((branch) =>
    evaluateJobRoutingDecision({
      campaign: input.campaign,
      job: branchJob(input.job, branch.branchId, branch.capabilitySku, intakeComplete),
      materials: parentMaterialsForBranch(input.materials, branch.capabilitySku),
      evaluatedAt: input.evaluatedAt,
    }),
  );
}

export type SocialPromoBranchProductionState =
  | "not_started"
  | "held"
  | "waiting"
  | "rendered"
  | "failed";

export type SocialPromoParentProductionState =
  | "not_started"
  | "held"
  | "waiting"
  | "incomplete"
  | "failed"
  | "complete";

/**
 * Parent is complete only when both branches rendered and passed their
 * production gates. One failed or missing branch keeps the parent open.
 */
export function socialPromoParentProductionState(
  campaign: Pick<CampaignRecord, "dispatchExecution">,
): {
  state: SocialPromoParentProductionState;
  branches: {
    branchId: string;
    dispatchId: string | null;
    state: SocialPromoBranchProductionState;
    skipReason?: string;
    failureCode?: string;
  }[];
} {
  const records = campaign.dispatchExecution?.records ?? [];
  const results = campaign.dispatchExecution?.designRendererObserver?.results ?? [];
  const branches = BRANCHES.map((branch) => {
    const record = records.find((entry) => entry.jobId.endsWith(`:${PARENT}:branch:${branch.branchId}`));
    const result = record ? results.find((entry) => entry.dispatchId === record.dispatchId) : undefined;
    const state: SocialPromoBranchProductionState = !result
      ? "not_started"
      : result.action === "skipped"
        ? result.skipReason === SOCIAL_PROMO_COMPOSITE_RENDER_HOLD
          ? "held"
          : "waiting"
        : result.ok
          ? "rendered"
          : "failed";
    return {
      branchId: branch.branchId,
      dispatchId: record?.dispatchId ?? null,
      state,
      ...(result?.action === "skipped" && result.skipReason ? { skipReason: result.skipReason } : {}),
      ...(result?.failureCode ? { failureCode: result.failureCode } : {}),
    };
  });
  const states = branches.map((branch) => branch.state);
  const state: SocialPromoParentProductionState = states.every((s) => s === "rendered")
    ? "complete"
    : states.includes("failed")
      ? "failed"
      : states.includes("rendered")
        ? "incomplete"
        : states.includes("held")
          ? "held"
          : states.includes("waiting")
            ? "waiting"
            : "not_started";
  return { state, branches };
}

export type SocialPromoCompositeDispatch = {
  customerJobCount: 1;
  parentJobId: string;
  packageId: typeof PARENT;
  customerFacingName: typeof CONTRACT.customerFacingName;
  listPriceCents: 19900;
  thankYouDiscountCents: number;
  amountDueCents: number;
  revisionLedgerCount: 1;
  job: SocialPromoCurrentDoorJob;
  optionalFacts: {
    cta: SocialPromoCurrentDoorJob["cta"];
    dates: string | null;
    phone: string | null;
    website: string | null;
  };
  renderHeld: true;
  renderHoldReason: typeof SOCIAL_PROMO_COMPOSITE_RENDER_HOLD;
  paymentStarted: false;
  productionStarted: false;
  branches: readonly {
    branchId: "social_posts" | "campaign_graphics";
    capabilitySku: "v2-rtu-social-posts" | "v2-rtu-promotion-graphics";
    customerOrder: false;
    routing: JobRoutingDecision;
    dispatch: JobDispatchRecord;
  }[];
};

export function resolveSocialPromoCompositeDispatch(input: {
  campaign: CampaignRecord;
  job: Pick<
    PurchasedJobRecord,
    "jobId" | "campaignId" | "skuId" | "intakeComplete" | "ownerApprovalPending"
  >;
  materials?: readonly CampaignMaterialItem[];
  evaluatedAt?: string;
}):
  | { ok: true; composite: SocialPromoCompositeDispatch }
  | { ok: false; code: string; message: string; branches?: SocialPromoCompositeDispatch["branches"] } {
  if (input.job.skuId !== PARENT_SERVICE && input.campaign.condensedOffer?.packageId !== PARENT) {
    return {
      ok: false,
      code: "NOT_SOCIAL_PROMO_PARENT",
      message: "Composite dispatch only covers the Social & Promo Graphics parent job.",
    };
  }

  const materials = input.materials ?? [];
  const parentBlocks = blockingMaterialsForSku(materials, PARENT, input.campaign.campaignId);
  if (parentBlocks.length > 0) {
    return {
      ok: false,
      code: "BLOCKING_MATERIALS",
      message: "Required Social & Promo Graphics materials still block both production branches.",
    };
  }

  const decisions = socialPromoCompositeRoutingDecisions({
    campaign: input.campaign,
    job: { ...input.job, skuId: PARENT_SERVICE },
    materials,
    evaluatedAt: input.evaluatedAt,
  });
  if (!decisions || decisions.length !== BRANCHES.length) {
    return {
      ok: false,
      code: "BRANCH_MISSING",
      message: "Both production branches must be present.",
    };
  }

  const branches = BRANCHES.map((branch, index) => {
    const routing = decisions[index]!;
    const dispatch = evaluateJobDispatch({
      campaignId: input.campaign.campaignId,
      routing,
      jobId: routing.jobId,
      skuId: branch.capabilitySku,
      evaluatedAt: input.evaluatedAt,
    });
    return {
      branchId: branch.branchId,
      capabilitySku: branch.capabilitySku,
      customerOrder: false as const,
      routing,
      dispatch,
    };
  });

  const built = buildSocialPromoCurrentDoorJob({
    campaignId: input.campaign.campaignId,
    purpose: readDoor(input.campaign, "purpose"),
    rights: readDoor(input.campaign, "rights"),
    ctaText: readDoor(input.campaign, "cta"),
    facts: readDoor(input.campaign, "facts"),
    prices: readDoor(input.campaign, "prices"),
  });
  if (!built.ok) return { ...built, branches };

  const notReady = branches.filter((branch) => !branch.dispatch.executionIdentityReady);
  if (notReady.length > 0) {
    return {
      ok: false,
      code: "BRANCH_NOT_EXECUTION_READY",
      message: notReady
        .map((branch) => `${branch.branchId}: ${branch.dispatch.blocker ?? branch.routing.blocker}`)
        .join("; "),
      branches,
    };
  }

  const dates = readDoor(input.campaign, "dates") || null;
  const phone = readDoor(input.campaign, "phone") || null;
  const website = readDoor(input.campaign, "website") || null;

  return {
    ok: true,
    composite: {
      customerJobCount: 1,
      parentJobId: built.job.jobId,
      packageId: PARENT,
      customerFacingName: CONTRACT.customerFacingName,
      listPriceCents: built.job.listPriceCents,
      thankYouDiscountCents: built.job.thankYouDiscountCents,
      amountDueCents: built.job.amountDueCents,
      revisionLedgerCount: 1,
      job: built.job,
      optionalFacts: {
        cta: built.job.cta,
        dates,
        phone,
        website,
      },
      renderHeld: true,
      renderHoldReason: SOCIAL_PROMO_COMPOSITE_RENDER_HOLD,
      paymentStarted: false,
      productionStarted: false,
      branches,
    },
  };
}
