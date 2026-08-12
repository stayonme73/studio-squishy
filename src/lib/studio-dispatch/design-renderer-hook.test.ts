/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import { mapFlyerProjectTruthFromJob } from "./map-flyer-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const HOOK_ART_DIR = path.join(REPO, "data", "campaign-design-artifacts");

function readyFlyerRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-flyer`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-flyer" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-test",
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
    skuId: "v2-rtu-flyer",
  });
}

function customerCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Cedar Lane Studio",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Customer flyer job",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        flyerPurpose: "Spring open house for neighborhood portraits",
        mustInclude:
          "Spring Open House — portraits $99. April 12 – April 20, 2026. Call (804) 555-0199 or visit cedarlane.example/open-house",
        materials: "Logo staged for Machine production",
        intendedUse: "Both print and digital",
        disclaimers: "Offer valid while appointments remain.",
      },
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
    relatedServiceIds: ["v2-rtu-flyer"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

afterEach(async () => {
  // Keep artifacts for Owner review of last run; only delete ephemeral test campaigns if needed.
});

describe("STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-1", () => {
  it("points v2-rtu-flyer primaryTool at studio_design_renderer", () => {
    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status !== "resolved") return;
    expect(flyer.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readyFlyerRecord("camp-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-hook-no-invoke::v2-rtu-flyer"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("mapper refuses certification fixture leakage", () => {
    const campaign = customerCampaign("camp-hook-leak");
    campaign.routeMapIntake!.answers.mustInclude =
      "CERTIFICATION FIXTURE Harbor & Oak $189 (804) 555-0142 harborandoak.example";
    const record = readyFlyerRecord("camp-hook-leak");
    const mapped = mapFlyerProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo("camp-hook-leak")],
      stagedLogoRelativePath:
        "docs/launch/studio-operating-design-renderer-proof-1/artifacts/v2-rtu-flyer/materials/harbor-oak-anchor-oak-oval-v1.svg",
    });
    expect(mapped.ok).toBe(false);
  });

  it("flyer hook refuses business-card SKU (card has its own hook)", async () => {
    const record = readyFlyerRecord("camp-hook-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-business-card" as const,
      jobId: "camp-hook-sku::v2-rtu-business-card",
      dispatchId: "dd:camp-hook-sku::v2-rtu-business-card",
    };
    const result = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: customerCampaign("camp-hook-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-hook-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it(
    "invokes renderer from ready dd:{jobId} with customer truth (no fixture leak)",
    async () => {
      const campaignId = `camp-design-dispatch-hook-1-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      const logoAbs = path.join(REPO, logoRel);
      mkdirSync(path.dirname(logoAbs), { recursive: true });
      writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readyFlyerRecord(campaignId);
      expect(record.executionIdentityReady).toBe(true);

      const result = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
        preferAnthropic: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.dispatchId).toMatch(/^dd:/);
      expect(result.canvaRequired).toBe(false);
      expect(result.makeRequired).toBe(false);
      expect(result.ownerRoutineProduction).toBe("NONE");
      expect(result.ok && (result.invocationOutcome === "RENDERED" || result.invocationOutcome === "ALREADY_RENDERED")).toBe(true);
      expect(result.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      const declared =
        result.ok && result.pipeline
          ? result.pipeline.declaredText
          : result.ok
            ? readFileSync(
                path.join(REPO, result.identity.htmlRelativePath),
                "utf8",
              )
            : "";
      expect(declared).not.toMatch(/CERTIFICATION FIXTURE/i);
      expect(declared).not.toMatch(/harborandoak\.example/i);
      expect(declared).toContain("Cedar Lane");
      expect(declared).toContain("$99");
      expect(declared).toContain("(804) 555-0199");

      const receipt = await fs.readFile(
        path.join(REPO, result.receiptRelativePath),
        "utf8",
      );
      expect(receipt).toContain('"status": "success"');
      expect(receipt).toContain("v2-rtu-flyer");
      void HOOK_ART_DIR;
    },
    120_000,
  );
});
