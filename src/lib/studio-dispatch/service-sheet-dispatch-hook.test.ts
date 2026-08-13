/**
 * STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokeServiceSheetDispatchHook } from "./service-sheet-dispatch-hook";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import {
  mapServiceSheetProjectTruthFromJob,
  parseServiceSheetServicesFromAnswers,
} from "./map-service-sheet-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readySheetRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-service-sheet`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-service-sheet" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-sheet-test",
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
    skuId: "v2-rtu-service-sheet",
  });
}

function customerSheetCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const serviceStructuredJson = JSON.stringify({
    listHeading: "Our Services",
    services: [
      {
        name: "Spring HVAC Tune-Up",
        description: "Seasonal system check.",
        startingPriceText: "$189",
      },
      {
        name: "Whole-Home Plumbing Assessment",
        description: "Walkthrough before larger work.",
        contactForPricingText: "Contact for pricing",
      },
      {
        name: "Custom Remodel Coordination",
        description: "Multi-trade coordination.",
      },
      {
        name: "Drain Clear Service",
        description: "Main-line clear.",
        startingPriceText: "$149",
      },
      {
        name: "Maintenance Membership Review",
        description: "Review coverage options.",
      },
    ],
  });
  return {
    campaignId,
    campaignName: "Cedar Lane Home Care",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Customer service-sheet job",
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
        businessName: "Cedar Lane Home Care",
        businessType: "Home services",
        contactDetails:
          "Call (804) 555-0199 · cedarlane.example · Richmond, VA",
        wording:
          "Starting prices shown where listed. Final scope confirmed on site.",
        materials: "Logo staged for Machine production.",
        intendedUse: "Both print and digital",
        serviceStructuredJson,
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
    relatedServiceIds: ["v2-rtu-service-sheet"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

describe("STUDIO-OPERATING-DESIGN-SERVICE-SHEET-DISPATCH-HOOK-1", () => {
  it("points v2-rtu-service-sheet primaryTool at studio_design_renderer only", () => {
    const sheet = resolveServiceProductionContract("v2-rtu-service-sheet");
    expect(sheet.status).toBe("resolved");
    if (sheet.status !== "resolved") return;
    expect(sheet.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const promo = resolveServiceProductionContract("v2-rtu-promotion-graphics");
    expect(promo.status).toBe("resolved");
    if (promo.status !== "resolved") return;
    // PROMOTION-GRAPHICS-DISPATCH-HOOK-1 — remapped; sealed sheet lane unchanged
    expect(promo.contract.primaryTool.toolId).toBe("studio_design_renderer");
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readySheetRecord("camp-sheet-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-sheet-hook-no-invoke::v2-rtu-service-sheet"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("parses structured services with all three pricing modes", () => {
    const ok = parseServiceSheetServicesFromAnswers({
      serviceStructuredJson: JSON.stringify({
        services: [
          { name: "A", startingPriceText: "$10" },
          { name: "B", contactForPricingText: "Contact for pricing" },
          { name: "C" },
        ],
      }),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.services.map((s) => s.priceMode)).toEqual([
      "listed",
      "contact_for_pricing",
      "omitted",
    ]);
  });

  it("mapper refuses certification fixture leakage", () => {
    const campaignId = "camp-sheet-hook-leak";
    const campaign = customerSheetCampaign(campaignId);
    campaign.routeMapIntake!.answers.wording =
      "CERTIFICATION FIXTURE / INTERNAL TEST disclaimer";
    const mapped = mapServiceSheetProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readySheetRecord(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath:
        "docs/launch/studio-operating-design-service-sheet-proof-1/artifacts/v2-rtu-service-sheet/materials/harbor-oak-anchor-oak-oval-v1.svg",
    });
    expect(mapped.ok).toBe(false);
  });

  it("refuses non-service-sheet SKUs", async () => {
    const record = readySheetRecord("camp-sheet-hook-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-menu" as const,
      jobId: "camp-sheet-hook-sku::v2-rtu-menu",
      dispatchId: "dd:camp-sheet-hook-sku::v2-rtu-menu",
    };
    const result = await invokeServiceSheetDispatchHook({
      repoRoot: REPO,
      campaign: customerSheetCampaign("camp-sheet-hook-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-sheet-hook-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it(
    "invokes service-sheet renderer from ready dd:{jobId}; repeat is ALREADY_RENDERED",
    async () => {
      const campaignId = `camp-design-sheet-dispatch-hook-1-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      const logoAbs = path.join(REPO, logoRel);
      mkdirSync(path.dirname(logoAbs), { recursive: true });
      writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readySheetRecord(campaignId);
      expect(record.executionIdentityReady).toBe(true);

      const first = await invokeServiceSheetDispatchHook({
        repoRoot: REPO,
        campaign: customerSheetCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });

      if (!first.ok) {
        // eslint-disable-next-line no-console
        console.error("HOOK_FAIL", first.failureCode, first.message);
      }
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.canvaRequired).toBe(false);
      expect(first.makeRequired).toBe(false);
      expect(first.ownerRoutineProduction).toBe("NONE");
      expect(first.invocationOutcome).toBe("RENDERED");
      expect(first.identity.serviceCount).toBe(5);
      expect(first.identity.listedCount).toBe(2);
      expect(first.identity.contactForPricingCount).toBe(1);
      expect(first.identity.omittedCount).toBe(2);

      const html = readFileSync(
        path.join(REPO, first.identity.htmlRelativePath),
        "utf8",
      );
      expect(html).not.toMatch(/CERTIFICATION FIXTURE/i);
      expect(html).toContain("Cedar Lane");
      expect(html).toContain("$189");
      expect(html).toContain("Contact for pricing");
      expect(html).toContain("Custom Remodel Coordination");

      const second = await invokeServiceSheetDispatchHook({
        repoRoot: REPO,
        campaign: customerSheetCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.renderVersion).toBe(first.identity.renderVersion);
      expect(second.identity.pngContentSha256).toBe(
        first.identity.pngContentSha256,
      );
    },
    180_000,
  );

  it(
    "changed authoritative pricing truth creates a new immutable version",
    async () => {
      const campaignId = `camp-design-sheet-dispatch-ver-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      mkdirSync(path.dirname(path.join(REPO, logoRel)), { recursive: true });
      writeFileSync(path.join(REPO, logoRel), HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readySheetRecord(campaignId);
      const firstCampaign = customerSheetCampaign(campaignId);
      const first = await invokeServiceSheetDispatchHook({
        repoRoot: REPO,
        campaign: firstCampaign,
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const changedJson = JSON.parse(
        String(firstCampaign.routeMapIntake!.answers.serviceStructuredJson),
      ) as {
        listHeading: string;
        services: Array<Record<string, string>>;
      };
      changedJson.services[0]!.startingPriceText = "$199";
      const changed: CampaignRecord = {
        ...firstCampaign,
        routeMapIntake: {
          submittedAt: firstCampaign.routeMapIntake!.submittedAt,
          answers: {
            ...firstCampaign.routeMapIntake!.answers,
            serviceStructuredJson: JSON.stringify(changedJson),
          },
        },
      };

      const second = await invokeServiceSheetDispatchHook({
        repoRoot: REPO,
        campaign: changed,
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("RENDERED");
      expect(second.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );
      expect(second.identity.pngContentSha256).not.toBe(
        first.identity.pngContentSha256,
      );
    },
    180_000,
  );
});
