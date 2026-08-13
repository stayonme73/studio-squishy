/**
 * STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1 tests.
 * sm-001 only — sm-001-monthly stays on the Canva baseline.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  DESIGN_RENDERER_SM_001_SKU,
  SM_001_LAYOUT_TEMPLATES,
  SM_001_SQUARE_PLATE,
} from "@/lib/studio-design-renderer";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import type { CampaignMaterialItem } from "@/lib/materials/types";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";

import { runDesignRendererDispatchObserver } from "./design-renderer-observer";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { mapSm001ProjectTruthFromJob } from "./map-sm-001-job-truth";
import { invokeSm001DispatchHook } from "./sm-001-dispatch-hook";
import type { DispatchExecutionRecord, JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");

/** Full campaign richness → extended copy + prior price → N = 6. */
const FULL_POSTS_ABOUT =
  "Promote an offer — Spring Tune-Up + Drain Clear $189, was $249. " +
  "Plain, steady service for homeowners who want clear help. " +
  "March 10 – April 15, 2026.";

/** Offer facts + dates only, no extended copy or prior price → N = 4. */
const CORE_POSTS_ABOUT =
  "Promote an offer — Spring Tune-Up + Drain Clear $189. March 10 – April 15, 2026.";

function readySm001Record(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${DESIGN_RENDERER_SM_001_SKU}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: DESIGN_RENDERER_SM_001_SKU,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "social" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-sm-001-test",
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
    skuId: DESIGN_RENDERER_SM_001_SKU,
  });
}

function sm001Campaign(
  campaignId: string,
  overrides?: {
    postsAbout?: string;
    extraAnswers?: Record<string, string>;
  },
): CampaignRecord {
  const now = new Date().toISOString();
  const answers: Record<string, string> = {
    socialPostsPurposeChoice: "Promote an offer",
    socialPostsActionChoice: "Book now",
    postsAbout: overrides?.postsAbout ?? FULL_POSTS_ABOUT,
    callToAction:
      "Book now — Destination: (804) 555-0142 · cedarlane.example/book-tuneup",
    materials: "Selected materials path: I can provide a logo",
    wordingHashtags: "No required wording, disclosures, or hashtags provided yet.",
    mustNotSay: "",
    ...(overrides?.extraAnswers ?? {}),
  };

  return {
    campaignId,
    campaignName: "Cedar Lane Home Care",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "sm-001 Launch Set dispatch hook test",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: { submittedAt: now, answers },
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
    relatedServiceIds: [DESIGN_RENDERER_SM_001_SKU],
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

describe("STUDIO-OPERATING-DESIGN-SM-001-DISPATCH-HOOK-1", () => {
  const seededMaterialCampaignIds: string[] = [];

  afterEach(async () => {
    await Promise.all(
      seededMaterialCampaignIds
        .splice(0)
        .map((id) =>
          fs
            .unlink(path.join(MATERIALS_DIR, `${id}.json`))
            .catch(() => undefined),
        ),
    );
  });

  it("remaps sm-001 to the Studio Design Renderer and leaves sm-001-monthly on Canva", () => {
    const sm001 = resolveServiceProductionContract("sm-001");
    expect(sm001.status).toBe("resolved");
    if (sm001.status !== "resolved") return;
    expect(sm001.contract.primaryTool.toolId).toBe("studio_design_renderer");
    expect(sm001.contract.readiness).toBe("contract_ready");
    expect(sm001.contract.formatExportRequirements.join(" ")).toMatch(
      /caption/i,
    );
    expect(sm001.contract.formatExportRequirements.join(" ")).toMatch(
      /posting order/i,
    );
    expect(sm001.contract.formatExportRequirements.join(" ")).toMatch(
      /calendar/i,
    );
    expect(sm001.contract.readinessNotes).toMatch(/Canva is not on the fulfillment spine/i);

    const monthly = resolveServiceProductionContract("sm-001-monthly");
    expect(monthly.status).toBe("resolved");
    if (monthly.status !== "resolved") return;
    expect(monthly.contract.primaryTool.toolId).toBe("canva");
  });

  it("evaluateJobDispatch forms the sm-001 execution identity without invoking", () => {
    const record = readySm001Record("camp-sm-001-identity");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-sm-001-identity::sm-001"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("maps campaign truth to a six-post Launch Set with Studio layout templates", () => {
    const campaignId = "camp-sm-001-map-full";
    const mapped = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId),
      dispatchRecord: readySm001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;

    expect(mapped.truth.outputMode).toBe("customer");
    expect(mapped.truth.plannedPostCount).toBe(6);
    expect(mapped.truth.plannedPostCountSelection.selectedBeforeExecution).toBe(
      true,
    );
    expect(mapped.truth.assets.map((a) => a.assetId)).toEqual([
      "social-post-1",
      "social-post-2",
      "social-post-3",
      "social-post-4",
      "social-post-5",
      "social-post-6",
    ]);
    expect(mapped.truth.assets.map((a) => a.layoutTemplate)).toEqual([
      ...SM_001_LAYOUT_TEMPLATES,
    ]);
    expect(mapped.structure.plateId).toBe(SM_001_SQUARE_PLATE.plateId);
    expect(mapped.structure.executablePlate).toBe("square");
    expect(mapped.structure.calendarRequired).toBe(true);
    expect(mapped.structure.captionSource).toBe("studio_written");
    expect(mapped.truth.priceDisplay).toBe("$189");
    expect(mapped.truth.wasPriceDisplay).toMatch(/249/);
    expect(mapped.truth.dateWindow).toBe("March 10 – April 15, 2026");
    expect(mapped.truth.proofScopeNote).toMatch(/DISPATCH-HOOK-1/);
  });

  it("selects N=4 for core richness and never pads the set", () => {
    const campaignId = "camp-sm-001-map-core";
    const mapped = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, { postsAbout: CORE_POSTS_ABOUT }),
      dispatchRecord: readySm001Record(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(mapped.ok).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.plannedPostCount).toBe(4);
    expect(mapped.truth.assets).toHaveLength(4);
  });

  it("fails closed on missing logo, missing price, fixture content, and smuggled Studio decisions", () => {
    const campaignId = "camp-sm-001-map-fail";
    const record = readySm001Record(campaignId);
    const logoRel = stageLogo(campaignId);

    const noLogo = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId),
      dispatchRecord: record,
      materials: [],
      stagedLogoRelativePath: logoRel,
    });
    expect(noLogo.ok).toBe(false);
    if (!noLogo.ok) expect(noLogo.code).toBe("MISSING_REQUIRED_MATERIAL");

    const noPrice = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, {
        postsAbout:
          "Promote an offer — Spring Tune-Up + Drain Clear. March 10 – April 15, 2026.",
      }),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(noPrice.ok).toBe(false);
    if (!noPrice.ok) {
      expect(noPrice.code).toBe("MISSING_REQUIRED_TRUTH");
      expect(noPrice.message).toMatch(/price/i);
    }

    const noDates = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, {
        postsAbout: "Promote an offer — Spring Tune-Up + Drain Clear $189.",
      }),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(noDates.ok).toBe(false);
    if (!noDates.ok) expect(noDates.message).toMatch(/date window/i);

    const fixture = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, {
        postsAbout: `CERTIFICATION FIXTURE — ${FULL_POSTS_ABOUT}`,
      }),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(fixture.ok).toBe(false);
    if (!fixture.ok) expect(fixture.code).toBe("INVALID_DESIGN_SPEC");

    const smuggled = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, {
        extraAnswers: { post5_layoutTemplate: "proof_point" },
      }),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(smuggled.ok).toBe(false);
    if (!smuggled.ok) {
      expect(smuggled.code).toBe("UNAUTHORIZED_CUSTOMER_FIELD");
    }

    const smuggledCount = mapSm001ProjectTruthFromJob({
      repoRoot: REPO,
      campaign: sm001Campaign(campaignId, {
        extraAnswers: { howManyPosts: "6" },
      }),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: logoRel,
    });
    expect(smuggledCount.ok).toBe(false);
    if (!smuggledCount.ok) {
      expect(smuggledCount.code).toBe("UNAUTHORIZED_CUSTOMER_FIELD");
    }
  });

  it("refuses other SKUs, not-ready dispatch, and a non-renderer executor", async () => {
    const campaignId = "camp-sm-001-refuse";
    const ready = readySm001Record(campaignId);
    const campaign = sm001Campaign(campaignId);
    const materials = [approvedLogo(campaignId)];
    const logoRel = stageLogo(campaignId);

    const wrongSku = await invokeSm001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: {
        ...ready,
        skuId: "v2-rtu-social-posts" as const,
        jobId: `${campaignId}::v2-rtu-social-posts`,
      },
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(wrongSku.ok).toBe(false);
    if (!wrongSku.ok) expect(wrongSku.failureCode).toBe("SKU_NOT_SUPPORTED");

    const notReady = await invokeSm001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: evaluateJobDispatch({
        campaignId,
        routing: null,
        jobId: `${campaignId}::${DESIGN_RENDERER_SM_001_SKU}`,
        skuId: DESIGN_RENDERER_SM_001_SKU,
      }),
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(notReady.ok).toBe(false);
    if (!notReady.ok) expect(notReady.failureCode).toBe("DISPATCH_NOT_READY");

    const wrongTool = await invokeSm001DispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: {
        ...ready,
        requirements: {
          ...ready.requirements!,
          primaryTool: {
            ...ready.requirements!.primaryTool,
            toolId: "canva",
          },
        },
      },
      materials,
      stagedLogoRelativePath: logoRel,
    });
    expect(wrongTool.ok).toBe(false);
    if (!wrongTool.ok) expect(wrongTool.failureCode).toBe("EXECUTOR_MISMATCH");
  });

  it(
    "renders 6/6 posts with captions, order, and calendar; repeat is ALREADY_RENDERED",
    async () => {
      const campaignId = `camp-design-sm-001-dispatch-hook-1-${Date.now()}`;
      const record = readySm001Record(campaignId);
      const materials = [approvedLogo(campaignId)];
      const logoRel = stageLogo(campaignId);

      const first = await invokeSm001DispatchHook({
        repoRoot: REPO,
        campaign: sm001Campaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      expect(first.ownerRoutineProduction).toBe("NONE");
      expect(first.canvaRequired).toBe(false);
      expect(first.makeRequired).toBe(false);
      expect(first.plannedPostCount).toBe(6);
      expect(first.identity.assets).toHaveLength(6);
      expect(first.identity.captions).toHaveLength(6);
      expect(first.identity.postingOrder).toHaveLength(6);
      expect(first.identity.calendar.entries).toHaveLength(6);
      expect(first.identity.calendar.advisory).toBe(true);
      expect(first.identity.calendar.publishingExcluded).toBe(true);
      expect(first.identity.setQaOk).toBe(true);
      expect(first.identity.campaignSetRenderVersion).toBe(1);
      for (const asset of first.identity.assets) {
        expect(asset.plateId).toBe(SM_001_SQUARE_PLATE.plateId);
        expect(asset.widthPx).toBe(SM_001_SQUARE_PLATE.widthPx);
        expect(asset.heightPx).toBe(SM_001_SQUARE_PLATE.heightPx);
        expect(asset.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      }
      expect(first.identity.postingOrder.map((e) => e.assetId)).toEqual(
        first.identity.assets.map((a) => a.assetId),
      );
      expect(first.receiptRelativePath).toMatch(
        /renders\/v1\/dispatch-hook-receipt\.json$/,
      );

      const v1 = first.identity.campaignSetRenderVersion;
      const hash1 = first.identity.assets[0]!.pngContentSha256;
      const calendarFingerprint = first.identity.calendarFingerprint;

      const second = await invokeSm001DispatchHook({
        repoRoot: REPO,
        campaign: sm001Campaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.campaignSetRenderVersion).toBe(v1);
      expect(second.identity.assets[0]!.pngContentSha256).toBe(hash1);
      expect(second.identity.calendarFingerprint).toBe(calendarFingerprint);
      expect(second.idempotencyKey).toBe(first.idempotencyKey);
    },
    600_000,
  );

  it(
    "fails closed on an incomplete set — missing calendar entry and mid-set export failure",
    async () => {
      const base = `camp-design-sm-001-dispatch-fail-${Date.now()}`;

      const missingCalendarEntry = await invokeSm001DispatchHook({
        repoRoot: REPO,
        campaign: sm001Campaign(`${base}-cal`),
        dispatchRecord: readySm001Record(`${base}-cal`),
        materials: [approvedLogo(`${base}-cal`)],
        stagedLogoRelativePath: stageLogo(`${base}-cal`),
        forceMissingCalendarEntry: true,
      });
      expect(missingCalendarEntry.ok).toBe(false);
      if (missingCalendarEntry.ok) return;
      expect(missingCalendarEntry.failureCode).toMatch(
        /CALENDAR_FAILURE|SET_CONSISTENCY_FAILURE|COUNT_MISMATCH|PARTIAL_SET_FAILURE/,
      );

      const partial = await invokeSm001DispatchHook({
        repoRoot: REPO,
        campaign: sm001Campaign(`${base}-partial`),
        dispatchRecord: readySm001Record(`${base}-partial`),
        materials: [approvedLogo(`${base}-partial`)],
        stagedLogoRelativePath: stageLogo(`${base}-partial`),
        forcePartialExportFail: true,
      });
      expect(partial.ok).toBe(false);
      if (partial.ok) return;
      expect(partial.failureCode).toBe("PARTIAL_SET_FAILURE");
      expect(partial.message).toMatch(/plannedPostCount stays 6/);
    },
    600_000,
  );

  it(
    "observer invokes the sm-001 lane for a ready dispatch record",
    async () => {
      const campaignId = `camp-design-sm-001-observer-${Date.now()}`;
      seededMaterialCampaignIds.push(campaignId);
      const now = new Date().toISOString();
      const record = readySm001Record(campaignId);
      stageLogo(campaignId);
      await writeMaterialsEnvelope({
        campaignId,
        items: [approvedLogo(campaignId)],
        updatedAt: now,
        syncedAt: now,
        version: 1,
      });

      const dispatch: DispatchExecutionRecord = {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: now,
        lastAttemptAt: now,
        activationCheckoutSessionId: `cs_sm001_${campaignId}`,
        records: [record],
        ownerActionRequired: false,
      };

      const pass = await runDesignRendererDispatchObserver({
        campaign: sm001Campaign(campaignId),
        dispatch,
        repoRoot: REPO,
      });

      const result = pass.results.find(
        (r) => r.skuId === DESIGN_RENDERER_SM_001_SKU,
      );
      expect(result?.action).toBe("invoked");
      expect(result?.ok).toBe(true);
      expect(result?.invocationOutcome).toBe("RENDERED");
      expect(result?.renderVersion).toBe(1);
      expect(result?.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(result?.ownerRoutineProduction).toBe("NONE");
      expect(result?.canvaRequired).toBe(false);
      expect(result?.makeRequired).toBe(false);

      const repeat = await runDesignRendererDispatchObserver({
        campaign: sm001Campaign(campaignId),
        dispatch,
        repoRoot: REPO,
      });
      const repeatResult = repeat.results.find(
        (r) => r.skuId === DESIGN_RENDERER_SM_001_SKU,
      );
      expect(repeatResult?.ok).toBe(true);
      expect(repeatResult?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(repeatResult?.renderVersion).toBe(result?.renderVersion);
      expect(repeatResult?.pngContentSha256).toBe(result?.pngContentSha256);
    },
    600_000,
  );
});
