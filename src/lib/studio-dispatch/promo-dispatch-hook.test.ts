/**
 * STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import {
  PROMO_INTAKE_PLATE_OPTIONS,
  PROMO_PORTRAIT_PLATE,
  PROMO_SQUARE_PLATE,
} from "@/lib/studio-design-renderer";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokePromoDispatchHook } from "./promo-dispatch-hook";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import { mapPromoProjectTruthFromJob } from "./map-promo-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

const SQUARE_PLATE = PROMO_INTAKE_PLATE_OPTIONS[0];
const PORTRAIT_PLATE = PROMO_INTAKE_PLATE_OPTIONS[1];
const LANDSCAPE_PLATE = PROMO_INTAKE_PLATE_OPTIONS[2];

function readyPromoRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-promotion-graphics`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-promotion-graphics" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-promo-test",
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
    skuId: "v2-rtu-promotion-graphics",
  });
}

function customerPromoCampaign(
  campaignId: string,
  overrides?: {
    graphicAPurpose?: string;
    graphicAPlate?: string;
    graphicBPurpose?: string;
    graphicBPlate?: string;
    omitPurposeA?: boolean;
    omitPlateA?: boolean;
    campaignFocus?: string;
  },
): CampaignRecord {
  const now = new Date().toISOString();
  const answers: Record<string, string> = {
    businessType: "Home services",
    campaignFocus:
      overrides?.campaignFocus ??
      "Spring HVAC Tune-Up — neighborhood launch for March through April.",
    mustInclude:
      "Spring Tune-Up $189. March 10 – April 15, 2026. Call (804) 555-0142 · cedarlane.example/tuneup",
    dates: "March 10 – April 15, 2026",
    callToAction: "Call (804) 555-0142 or visit cedarlane.example/tuneup",
    materials: "Logo staged for Machine production.",
    disclaimers: "While appointments remain. Finished graphics — you distribute.",
  };
  if (!overrides?.omitPurposeA) {
    answers.graphicA_authorizedPurpose = overrides?.graphicAPurpose ?? "Social";
  }
  if (!overrides?.omitPlateA) {
    answers.graphicA_agreedPlate = overrides?.graphicAPlate ?? SQUARE_PLATE;
  }
  answers.graphicB_authorizedPurpose = overrides?.graphicBPurpose ?? "Print";
  answers.graphicB_agreedPlate = overrides?.graphicBPlate ?? PORTRAIT_PLATE;

  return {
    campaignId,
    campaignName: "Cedar Lane Home Care",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Promotion graphics dispatch hook test",
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
    relatedServiceIds: ["v2-rtu-promotion-graphics"],
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

describe("STUDIO-OPERATING-DESIGN-PROMOTION-GRAPHICS-DISPATCH-HOOK-1", () => {
  it("retargets only v2-rtu-promotion-graphics primaryTool; sealed lanes stay renderer", () => {
    const promo = resolveServiceProductionContract("v2-rtu-promotion-graphics");
    expect(promo.status).toBe("resolved");
    if (promo.status !== "resolved") return;
    expect(promo.contract.primaryTool.toolId).toBe("studio_design_renderer");

    for (const sku of [
      "v2-rtu-flyer",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
    ] as const) {
      const sealed = resolveServiceProductionContract(sku);
      expect(sealed.status).toBe("resolved");
      if (sealed.status !== "resolved") return;
      expect(sealed.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readyPromoRecord("camp-promo-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-promo-hook-no-invoke::v2-rtu-promotion-graphics"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("mapper preserves exact per-asset purposes and plates; Landscape fails closed", () => {
    const campaignId = "camp-promo-hook-map";
    const ok = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerPromoCampaign(campaignId),
      dispatchRecord: readyPromoRecord(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.truth.assets[0]!.assetId).toBe("campaign-graphic-a");
    expect(ok.truth.assets[0]!.authorizedPurpose).toContain("Social");
    expect(ok.truth.assets[0]!.plateId).toBe(PROMO_SQUARE_PLATE.plateId);
    expect(ok.truth.assets[1]!.assetId).toBe("campaign-graphic-b");
    expect(ok.truth.assets[1]!.authorizedPurpose).toContain("Print");
    expect(ok.truth.assets[1]!.plateId).toBe(PROMO_PORTRAIT_PLATE.plateId);

    const landscape = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerPromoCampaign(`${campaignId}-land`, {
        graphicAPlate: LANDSCAPE_PLATE,
      }),
      dispatchRecord: readyPromoRecord(`${campaignId}-land`),
      materials: [approvedLogo(`${campaignId}-land`)],
      stagedLogoRelativePath: stageLogo(`${campaignId}-land`),
    });
    expect(landscape.ok).toBe(false);
    if (landscape.ok) return;
    expect(landscape.code).toBe("UNSUPPORTED_PLATE_EXECUTION");
    expect(landscape.message).toMatch(/not yet proven|not certified/i);
  });

  it("missing purpose / missing plate fail closed", () => {
    const campaignId = "camp-promo-hook-missing";
    const missingPurpose = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerPromoCampaign(campaignId, { omitPurposeA: true }),
      dispatchRecord: readyPromoRecord(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(missingPurpose.ok).toBe(false);
    if (missingPurpose.ok) return;
    expect(missingPurpose.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(missingPurpose.message).toMatch(/authorizedPurpose/i);

    const missingPlate = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign: customerPromoCampaign(`${campaignId}-p`, { omitPlateA: true }),
      dispatchRecord: readyPromoRecord(`${campaignId}-p`),
      materials: [approvedLogo(`${campaignId}-p`)],
      stagedLogoRelativePath: stageLogo(`${campaignId}-p`),
    });
    expect(missingPlate.ok).toBe(false);
    if (missingPlate.ok) return;
    expect(missingPlate.code).toBe("MISSING_REQUIRED_TRUTH");
    expect(missingPlate.message).toMatch(/agreedPlate/i);
  });

  it("mapper refuses certification fixture leakage", () => {
    const campaignId = "camp-promo-hook-leak";
    const campaign = customerPromoCampaign(campaignId, {
      campaignFocus: "CERTIFICATION FIXTURE / INTERNAL TEST launch",
    });
    const mapped = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyPromoRecord(campaignId),
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(mapped.ok).toBe(false);
  });

  it("refuses non-promotion-graphics SKUs and wrong tool", async () => {
    const record = readyPromoRecord("camp-promo-hook-sku");
    const badSku = {
      ...record,
      skuId: "v2-rtu-service-sheet" as const,
      jobId: "camp-promo-hook-sku::v2-rtu-service-sheet",
      dispatchId: "dd:camp-promo-hook-sku::v2-rtu-service-sheet",
    };
    const skuResult = await invokePromoDispatchHook({
      repoRoot: REPO,
      campaign: customerPromoCampaign("camp-promo-hook-sku"),
      dispatchRecord: badSku,
      materials: [approvedLogo("camp-promo-hook-sku")],
    });
    expect(skuResult.ok).toBe(false);
    if (skuResult.ok) return;
    expect(skuResult.failureCode).toBe("SKU_NOT_SUPPORTED");

    const wrongTool = {
      ...record,
      requirements: {
        ...record.requirements!,
        primaryTool: {
          ...record.requirements!.primaryTool,
          toolId: "canva" as const,
        },
      },
    };
    const toolResult = await invokePromoDispatchHook({
      repoRoot: REPO,
      campaign: customerPromoCampaign("camp-promo-hook-tool"),
      dispatchRecord: wrongTool,
      materials: [approvedLogo("camp-promo-hook-tool")],
    });
    expect(toolResult.ok).toBe(false);
    if (toolResult.ok) return;
    expect(toolResult.failureCode).toBe("EXECUTOR_MISMATCH");
  });

  it(
    "Square + Portrait ready set auto-renders; purposes/plates preserved; repeat ALREADY_RENDERED",
    async () => {
      const campaignId = `camp-design-promo-dispatch-hook-1-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyPromoRecord(campaignId);
      expect(record.executionIdentityReady).toBe(true);

      const first = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(campaignId),
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
      expect(first.identity.assets).toHaveLength(2);
      expect(first.identity.assets[0]!.assetId).toBe("campaign-graphic-a");
      expect(first.identity.assets[0]!.authorizedPurpose).toContain("Social");
      expect(first.identity.assets[0]!.plateId).toBe(PROMO_SQUARE_PLATE.plateId);
      expect(first.identity.assets[0]!.widthPx).toBe(1024);
      expect(first.identity.assets[0]!.heightPx).toBe(1024);
      expect(first.identity.assets[1]!.assetId).toBe("campaign-graphic-b");
      expect(first.identity.assets[1]!.authorizedPurpose).toContain("Print");
      expect(first.identity.assets[1]!.plateId).toBe(PROMO_PORTRAIT_PLATE.plateId);
      expect(first.identity.assets[1]!.widthPx).toBe(1024);
      expect(first.identity.assets[1]!.heightPx).toBe(1536);
      expect(first.identity.setQaOk).toBe(true);

      const htmlA = readFileSync(
        path.join(REPO, first.identity.assets[0]!.htmlRelativePath),
        "utf8",
      );
      expect(htmlA).not.toMatch(/CERTIFICATION FIXTURE/i);
      expect(htmlA).toContain("Cedar Lane");
      expect(htmlA).toContain("$189");

      const second = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.campaignSetRenderVersion).toBe(
        first.identity.campaignSetRenderVersion,
      );
      expect(second.identity.assets[0]!.pngContentSha256).toBe(
        first.identity.assets[0]!.pngContentSha256,
      );
      expect(second.identity.assets[1]!.pngContentSha256).toBe(
        first.identity.assets[1]!.pngContentSha256,
      );
    },
    240_000,
  );

  it(
    "Landscape selection fails closed as unproven (no silent substitution)",
    async () => {
      const campaignId = `camp-design-promo-dispatch-land-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const result = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(campaignId, {
          graphicBPlate: LANDSCAPE_PLATE,
        }),
        dispatchRecord: readyPromoRecord(campaignId),
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("UNSUPPORTED_PLATE_EXECUTION");
      expect(result.message).toMatch(/No silent substitution/i);
      expect(result.canvaRequired).toBe(false);
      expect(result.ownerRoutineProduction).toBe("NONE");
    },
    60_000,
  );

  it(
    "changed authoritative campaign truth creates immutable campaign-set vN+1",
    async () => {
      const campaignId = `camp-design-promo-dispatch-ver-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyPromoRecord(campaignId);
      const firstCampaign = customerPromoCampaign(campaignId);
      const first = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: firstCampaign,
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const changed: CampaignRecord = {
        ...firstCampaign,
        routeMapIntake: {
          submittedAt: firstCampaign.routeMapIntake!.submittedAt,
          answers: {
            ...firstCampaign.routeMapIntake!.answers,
            mustInclude:
              "Spring Tune-Up $199. March 10 – April 15, 2026. Call (804) 555-0142 · cedarlane.example/tuneup",
          },
        },
      };

      const second = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: changed,
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("RENDERED");
      expect(second.identity.campaignSetRenderVersion).toBeGreaterThan(
        first.identity.campaignSetRenderVersion,
      );
      expect(second.identity.assets[0]!.pngContentSha256).not.toBe(
        first.identity.assets[0]!.pngContentSha256,
      );
    },
    240_000,
  );

  it(
    "Asset A failure / Asset B failure / set QA failure each block the set",
    async () => {
      const base = `camp-design-promo-dispatch-fail-${Date.now()}`;

      const aFail = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(`${base}-a`),
        dispatchRecord: readyPromoRecord(`${base}-a`),
        materials: [approvedLogo(`${base}-a`)],
        stagedLogoRelativePath: stageLogo(`${base}-a`),
        forceFirstAssetExportFail: true,
      });
      expect(aFail.ok).toBe(false);
      if (aFail.ok) return;
      expect(aFail.failureCode).toBe("EXPORT_FAILURE");

      const bFail = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(`${base}-b`),
        dispatchRecord: readyPromoRecord(`${base}-b`),
        materials: [approvedLogo(`${base}-b`)],
        stagedLogoRelativePath: stageLogo(`${base}-b`),
        forceSecondAssetExportFail: true,
      });
      expect(bFail.ok).toBe(false);
      if (bFail.ok) return;
      expect(bFail.failureCode).toBe("PARTIAL_SET_FAILURE");

      const setFail = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(`${base}-set`),
        dispatchRecord: readyPromoRecord(`${base}-set`),
        materials: [approvedLogo(`${base}-set`)],
        stagedLogoRelativePath: stageLogo(`${base}-set`),
        forceSetConsistencyFail: true,
      });
      expect(setFail.ok).toBe(false);
      if (setFail.ok) return;
      expect(setFail.failureCode).toBe("SET_CONSISTENCY_FAILURE");

      const qaFail = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign: customerPromoCampaign(`${base}-qa`),
        dispatchRecord: readyPromoRecord(`${base}-qa`),
        materials: [approvedLogo(`${base}-qa`)],
        stagedLogoRelativePath: stageLogo(`${base}-qa`),
        forceQaFail: true,
      });
      expect(qaFail.ok).toBe(false);
      if (qaFail.ok) return;
      expect(qaFail.failureCode).toBe("QA_FAILURE");
    },
    360_000,
  );
});
