/**
 * STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  SOCIAL_POST_ROLE_ANGLES,
  SOCIAL_POSTS_SQUARE_PLATE,
} from "@/lib/studio-design-renderer";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokeSocialPostsDispatchHook } from "./social-posts-dispatch-hook";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { mapSocialPostsProjectTruthFromJob } from "./map-social-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readySocialRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-social-posts`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-social-posts" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "social" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-social-test",
    capabilityReadiness: "contract_ready" as const,
    evaluatedAt: new Date().toISOString(),
    reason: null,
    blocker: null,
    ownerActionRequired: false as const,
  };
  return evaluateJobDispatch({
    campaignId,
    routing,
    jobId,
    skuId: "v2-rtu-social-posts",
  });
}

function customerSocialCampaign(
  campaignId: string,
  overrides?: {
    platform?: string;
    omitPurpose?: boolean;
    omitAction?: boolean;
    omitPlatform?: boolean;
    postsAbout?: string;
    smuggleRole?: boolean;
  },
): CampaignRecord {
  const now = new Date().toISOString();
  const answers: Record<string, string> = {
    socialPostsPurposeChoice: "Promote an offer",
    socialPostsActionChoice: "Book now",
    socialPostsPlatformChoice: overrides?.platform ?? "Instagram Post",
    socialPostsMaterialsChoices: "I can provide a logo",
    postsAbout:
      overrides?.postsAbout ??
      "Promote an offer — Spring Tune-Up + Drain Clear $189. March 10 – April 15, 2026.",
    callToAction:
      "Book now — Destination: (804) 555-0142 · cedarlane.example/book-tuneup",
    platform: `${overrides?.platform ?? "Instagram Post"} — Square or portrait feed graphic`,
    materials: "Selected materials path: I can provide a logo",
    wordingHashtags: "No required wording, disclosures, or hashtags provided yet.",
    mustNotSay: "",
  };
  if (overrides?.omitPurpose) {
    delete answers.socialPostsPurposeChoice;
    delete answers.postsAbout;
  }
  if (overrides?.omitAction) {
    delete answers.socialPostsActionChoice;
    delete answers.callToAction;
  }
  if (overrides?.omitPlatform) {
    delete answers.socialPostsPlatformChoice;
    delete answers.platform;
  }
  if (overrides?.smuggleRole) {
    answers.post1_roleAngle = "offer_lead";
  }

  return {
    campaignId,
    campaignName: "Cedar Lane Home Care",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Social posts dispatch hook test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers,
    },
    routeMapIntakeSubmittedAt: now,
  };
}

function approvedLogo(campaignId: string): CampaignMaterialItem {
  const now = new Date().toISOString();
  return {
    id: `logo-${campaignId}`,
    category: "logo-brand",
    requirementLevel: "required",
    reviewStatus: "approved_for_use",
    contentKind: "file-metadata",
    label: "Logo",
    reason: "Brand mark",
    relatedServiceIds: ["v2-rtu-social-posts"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

function stageLogo(campaignId: string): string {
  const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const logoAbs = path.join(REPO, logoRel);
  mkdirSync(path.dirname(logoAbs), { recursive: true });
  writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");
  return logoRel;
}

describe("STUDIO-OPERATING-DESIGN-SOCIAL-POSTS-DISPATCH-HOOK-1", () => {
  it("retargets only v2-rtu-social-posts; five sealed lanes stay renderer", () => {
    const social = resolveServiceProductionContract("v2-rtu-social-posts");
    expect(social.status).toBe("resolved");
    if (social.status !== "resolved") return;
    expect(social.contract.primaryTool.toolId).toBe("studio_design_renderer");

    for (const sku of [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-promotion-graphics",
    ] as const) {
      const sealed = resolveServiceProductionContract(sku);
      expect(sealed.status).toBe("resolved");
      if (sealed.status !== "resolved") return;
      expect(sealed.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readySocialRecord("camp-social-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-social-hook-no-invoke::v2-rtu-social-posts"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("mapper assigns Studio layout templates + square×4 + durable IDs/order", () => {
    const campaignId = "camp-social-hook-map";
    const ok = mapSocialPostsProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerSocialCampaign(campaignId),
      dispatchRecord: readySocialRecord(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.truth.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
    ]);
    expect(ok.truth.assets.map((a) => a.orderIndex)).toEqual([1, 2, 3, 4]);
    expect(ok.truth.assets.map((a) => a.roleAngle)).toEqual([
      ...SOCIAL_POST_ROLE_ANGLES,
    ]);
    expect(ok.truth.platformLabel).toMatch(/square feed/i);
    expect(ok.truth.outputMode).toBe("customer");
  });

  it("rejects smuggled postN_roleAngle and TikTok fail-closed", () => {
    const smuggle = mapSocialPostsProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerSocialCampaign("camp-social-smuggle", {
        smuggleRole: true,
      }),
      dispatchRecord: readySocialRecord("camp-social-smuggle"),
      materials: [approvedLogo("camp-social-smuggle")],
      stagedLogoRelativePath: stageLogo("camp-social-smuggle"),
    });
    expect(smuggle.ok).toBe(false);
    if (smuggle.ok) return;
    expect(smuggle.message).toMatch(/not a customer intake/i);

    const tiktok = mapSocialPostsProjectTruthFromJob({
      repoRoot: REPO,
      campaign: {
        ...customerSocialCampaign("camp-social-tiktok"),
        routeMapIntake: {
          submittedAt: new Date().toISOString(),
          answers: {
            postsAbout:
              "Spring Tune-Up $189. March 10 – April 15, 2026.",
            callToAction: "Call (804) 555-0142 · cedarlane.example/tuneup",
            platform: "TikTok",
          },
        },
      },
      dispatchRecord: readySocialRecord("camp-social-tiktok"),
      materials: [approvedLogo("camp-social-tiktok")],
      stagedLogoRelativePath: stageLogo("camp-social-tiktok"),
    });
    expect(tiktok.ok).toBe(false);
    if (tiktok.ok) return;
    expect(tiktok.code).toBe("UNSUPPORTED_PLATE_EXECUTION");
  });

  it("refuses non-social SKUs", async () => {
    const campaignId = "camp-social-wrong-sku";
    const flyerRecord = {
      ...readySocialRecord(campaignId),
      skuId: "v2-rtu-flyer" as const,
      jobId: `${campaignId}::v2-rtu-flyer`,
    };
    const result = await invokeSocialPostsDispatchHook({
      repoRoot: REPO,
      campaign: customerSocialCampaign(campaignId),
      dispatchRecord: flyerRecord,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it(
    "renders four-post set with captions + order; repeat is ALREADY_RENDERED; truth change → vN+1",
    async () => {
      const campaignId = `camp-design-social-dispatch-hook-1-${Date.now()}`;
      const record = readySocialRecord(campaignId);
      const logoRel = stageLogo(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      if (!first.ok) return;
      expect(first.ok).toBe(true);
      expect(first.invocationOutcome).toBe("RENDERED");
      expect(first.ownerRoutineProduction).toBe("NONE");
      expect(first.canvaRequired).toBe(false);
      expect(first.makeRequired).toBe(false);
      expect(first.identity.assets).toHaveLength(4);
      expect(first.identity.captions).toHaveLength(4);
      expect(first.identity.postingOrder).toHaveLength(4);
      expect(first.identity.campaignSetRenderVersion).toBe(1);
      for (const asset of first.identity.assets) {
        expect(asset.plateId).toBe(SOCIAL_POSTS_SQUARE_PLATE.plateId);
        expect(asset.widthPx).toBe(1024);
        expect(asset.heightPx).toBe(1024);
      }
      expect(first.identity.postingOrder.map((e) => e.assetId)).toEqual([
        "social-post-1",
        "social-post-2",
        "social-post-3",
        "social-post-4",
      ]);
      const v1 = first.identity.campaignSetRenderVersion;
      const hash1 = first.identity.assets[0]!.pngContentSha256;

      const second = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.campaignSetRenderVersion).toBe(v1);
      expect(second.identity.assets[0]!.pngContentSha256).toBe(hash1);

      const changed = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(campaignId, {
          postsAbout:
            "Promote an offer — Spring Tune-Up + Drain Clear $199. March 10 – April 15, 2026.",
        }),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(changed.ok).toBe(true);
      if (!changed.ok) return;
      expect(changed.invocationOutcome).toBe("RENDERED");
      expect(changed.identity.campaignSetRenderVersion).toBe(v1 + 1);
    },
    240_000,
  );

  it(
    "fail-closed on missing caption / third-post export / QA",
    async () => {
      const base = `camp-design-social-dispatch-fail-${Date.now()}`;

      const missingCaption = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(`${base}-cap`),
        dispatchRecord: readySocialRecord(`${base}-cap`),
        materials: [approvedLogo(`${base}-cap`)],
        stagedLogoRelativePath: stageLogo(`${base}-cap`),
        forceMissingCaption: true,
      });
      expect(missingCaption.ok).toBe(false);
      if (missingCaption.ok) return;
      expect(missingCaption.failureCode).toMatch(/CAPTION|BINDING|PARTIAL|QA/);

      const thirdFail = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(`${base}-p3`),
        dispatchRecord: readySocialRecord(`${base}-p3`),
        materials: [approvedLogo(`${base}-p3`)],
        stagedLogoRelativePath: stageLogo(`${base}-p3`),
        forceThirdAssetExportFail: true,
      });
      expect(thirdFail.ok).toBe(false);
      if (thirdFail.ok) return;
      expect(thirdFail.failureCode).toBe("PARTIAL_SET_FAILURE");

      const qaFail = await invokeSocialPostsDispatchHook({
        repoRoot: REPO,
        campaign: customerSocialCampaign(`${base}-qa`),
        dispatchRecord: readySocialRecord(`${base}-qa`),
        materials: [approvedLogo(`${base}-qa`)],
        stagedLogoRelativePath: stageLogo(`${base}-qa`),
        forceQaFail: true,
      });
      expect(qaFail.ok).toBe(false);
      if (qaFail.ok) return;
      expect(qaFail.failureCode).toMatch(/QA_FAILURE|SET_CONSISTENCY_FAILURE/);
    },
    240_000,
  );
});
