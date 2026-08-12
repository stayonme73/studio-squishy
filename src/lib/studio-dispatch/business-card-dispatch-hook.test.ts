/**
 * STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokeBusinessCardDispatchHook } from "./business-card-dispatch-hook";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { mapBusinessCardProjectTruthFromJob } from "./map-business-card-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readyCardRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-business-card`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-business-card" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-card-test",
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
    skuId: "v2-rtu-business-card",
  });
}

function customerCardCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Cedar Lane Studio",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Customer business card job",
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
        businessName: "Cedar Lane Studio",
        cardNameTitle: "Alex Rivera · Portrait Lead",
        phone: "(804) 555-0199",
        email: "alex@cedarlane.example",
        webOrSocial: "cedarlane.example",
        address: "Richmond, VA",
        brandMaterials: "Logo staged for Machine production; navy and cream.",
        cardSize: "Standard landscape",
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
    relatedServiceIds: ["v2-rtu-business-card"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

describe("STUDIO-OPERATING-DESIGN-BUSINESS-CARD-DISPATCH-HOOK-1", () => {
  it("points v2-rtu-business-card primaryTool at studio_design_renderer", () => {
    const card = resolveServiceProductionContract("v2-rtu-business-card");
    expect(card.status).toBe("resolved");
    if (card.status !== "resolved") return;
    expect(card.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status !== "resolved") return;
    expect(flyer.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readyCardRecord("camp-card-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-card-hook-no-invoke::v2-rtu-business-card"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("mapper refuses certification fixture leakage", () => {
    const campaign = customerCardCampaign("camp-card-hook-leak");
    campaign.routeMapIntake!.answers.email =
      "jordan.hale@harborandoak.example";
    const record = readyCardRecord("camp-card-hook-leak");
    const mapped = mapBusinessCardProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo("camp-card-hook-leak")],
      stagedLogoRelativePath:
        "docs/launch/studio-operating-design-business-card-proof-1/artifacts/v2-rtu-business-card/materials/harbor-oak-anchor-oak-oval-v1.svg",
    });
    expect(mapped.ok).toBe(false);
  });

  it("refuses non-card SKUs", async () => {
    const record = readyCardRecord("camp-card-hook-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-flyer" as const,
      jobId: "camp-card-hook-sku::v2-rtu-flyer",
      dispatchId: "dd:camp-card-hook-sku::v2-rtu-flyer",
    };
    const result = await invokeBusinessCardDispatchHook({
      repoRoot: REPO,
      campaign: customerCardCampaign("camp-card-hook-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-card-hook-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it(
    "invokes double-sided renderer from ready dd:{jobId} with customer truth",
    async () => {
      const campaignId = `camp-design-card-dispatch-hook-1-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      const logoAbs = path.join(REPO, logoRel);
      mkdirSync(path.dirname(logoAbs), { recursive: true });
      writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readyCardRecord(campaignId);
      expect(record.executionIdentityReady).toBe(true);

      const result = await invokeBusinessCardDispatchHook({
        repoRoot: REPO,
        campaign: customerCardCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.dispatchId).toMatch(/^dd:/);
      expect(result.canvaRequired).toBe(false);
      expect(result.makeRequired).toBe(false);
      expect(result.ownerRoutineProduction).toBe("NONE");
      expect(
        result.invocationOutcome === "RENDERED" ||
          result.invocationOutcome === "ALREADY_RENDERED",
      ).toBe(true);
      expect(result.identity.sides).toHaveLength(2);
      const front = result.identity.sides.find((s) => s.side === "front")!;
      const back = result.identity.sides.find((s) => s.side === "back")!;
      expect(front.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(back.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(front.pngContentSha256).not.toBe(back.pngContentSha256);

      const frontHtml = readFileSync(
        path.join(REPO, front.htmlRelativePath),
        "utf8",
      );
      expect(frontHtml).not.toMatch(/CERTIFICATION FIXTURE/i);
      expect(frontHtml).not.toMatch(/harborandoak\.example/i);
      expect(frontHtml).toContain("Cedar Lane");
      expect(frontHtml).toContain("Alex Rivera");
      expect(frontHtml).toContain("(804) 555-0199");
      expect(frontHtml).toContain("alex@cedarlane.example");

      const receipt = await fs.readFile(
        path.join(REPO, result.receiptRelativePath),
        "utf8",
      );
      expect(receipt).toContain('"status": "success"');
      expect(receipt).toContain("v2-rtu-business-card");
      expect(receipt).toContain("frontPngContentSha256");
      expect(receipt).toContain("backPngContentSha256");

      // Idempotent repeat
      const again = await invokeBusinessCardDispatchHook({
        repoRoot: REPO,
        campaign: customerCardCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(again.ok).toBe(true);
      if (!again.ok) return;
      expect(again.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(again.identity.renderVersion).toBe(result.identity.renderVersion);
    },
    180_000,
  );
});
