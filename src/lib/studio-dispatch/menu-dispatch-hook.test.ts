/**
 * STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1 tests.
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokeMenuDispatchHook } from "./menu-dispatch-hook";
import { buildDispatchId, evaluateJobDispatch } from "./evaluate";
import {
  mapMenuProjectTruthFromJob,
  parseMenuSectionsFromAnswers,
} from "./map-menu-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

function readyMenuRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::v2-rtu-menu`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: "v2-rtu-menu" as const,
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: "fp-menu-test",
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
    skuId: "v2-rtu-menu",
  });
}

function customerMenuCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const menuStructuredJson = JSON.stringify({
    sections: [
      {
        title: "Pastries",
        items: [
          {
            name: "Butter Croissant",
            description: "Flaky laminated layers, baked daily.",
            priceDisplay: "$3.75",
          },
          {
            name: "Cinnamon Roll",
            description: "Soft swirl with cream-cheese glaze.",
            priceDisplay: "$4.25",
          },
          {
            name: "Blueberry Muffin",
            description: "Bursting berries, crumb topping.",
            priceDisplay: "$3.50",
          },
        ],
      },
      {
        title: "Coffee",
        items: [
          {
            name: "Drip Coffee",
            description: "House blend, regular or decaf.",
            priceDisplay: "$2.75",
          },
          {
            name: "Cafe Latte",
            description: "Espresso with silky steamed milk.",
            priceDisplay: "$4.50",
          },
        ],
      },
    ],
  });
  return {
    campaignId,
    campaignName: "Maple Street Bakery",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Customer menu job",
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
        businessName: "Maple Street Bakery",
        businessType: "Bakery",
        dietaryLabels:
          "Contains wheat and dairy in various items. Customer-verified wording.",
        disclaimers: "Prices subject to change.",
        materials: "Logo staged for Machine production; warm bakery palette.",
        intendedUse: "Both print and digital",
        menuStructuredJson,
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
    relatedServiceIds: ["v2-rtu-menu"],
    uploadStatus: "stored",
    useAuthorization: { basis: "customer_owns", attestedAt: now },
  };
}

describe("STUDIO-OPERATING-DESIGN-MENU-DISPATCH-HOOK-1", () => {
  it("points v2-rtu-menu primaryTool at studio_design_renderer only", () => {
    const menu = resolveServiceProductionContract("v2-rtu-menu");
    expect(menu.status).toBe("resolved");
    if (menu.status !== "resolved") return;
    expect(menu.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const flyer = resolveServiceProductionContract("v2-rtu-flyer");
    expect(flyer.status).toBe("resolved");
    if (flyer.status !== "resolved") return;
    expect(flyer.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const card = resolveServiceProductionContract("v2-rtu-business-card");
    expect(card.status).toBe("resolved");
    if (card.status !== "resolved") return;
    expect(card.contract.primaryTool.toolId).toBe("studio_design_renderer");

    const sheet = resolveServiceProductionContract("v2-rtu-service-sheet");
    expect(sheet.status).toBe("resolved");
    if (sheet.status !== "resolved") return;
    expect(sheet.contract.primaryTool.toolId).toBe("canva");
  });

  it("evaluateJobDispatch still does not invoke the renderer", () => {
    const record = readyMenuRecord("camp-menu-hook-no-invoke");
    expect(record.executionIdentityReady).toBe(true);
    expect(record.dispatchId).toBe(
      buildDispatchId("camp-menu-hook-no-invoke::v2-rtu-menu"),
    );
    expect(record.requirements?.primaryTool.toolId).toBe(
      "studio_design_renderer",
    );
  });

  it("parses pipe-delimited menu lines fail-closed", () => {
    const ok = parseMenuSectionsFromAnswers({
      sections: "Pastries\nCoffee",
      items: [
        "Pastries | Butter Croissant | Flaky layers | $3.75",
        "Coffee | Drip Coffee | House blend | $2.75",
      ].join("\n"),
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.sections).toHaveLength(2);
    expect(ok.sections[0]!.items[0]!.priceDisplay).toBe("$3.75");

    const bad = parseMenuSectionsFromAnswers({
      sections: "Pastries",
      items: "Pastries | MissingPriceOnly",
    });
    expect(bad.ok).toBe(false);
  });

  it("mapper refuses certification fixture leakage", () => {
    const campaign = customerMenuCampaign("camp-menu-hook-leak");
    campaign.routeMapIntake!.answers.dietaryLabels =
      "INTERNAL TEST saltandcedar.example allergen copy";
    const record = readyMenuRecord("camp-menu-hook-leak");
    const mapped = mapMenuProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [approvedLogo("camp-menu-hook-leak")],
      stagedLogoRelativePath:
        "docs/launch/studio-operating-design-menu-proof-1/artifacts/v2-rtu-menu/materials/salt-cedar-wordmark-sprig-v1.svg",
    });
    expect(mapped.ok).toBe(false);
  });

  it("refuses non-menu SKUs", async () => {
    const record = readyMenuRecord("camp-menu-hook-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-flyer" as const,
      jobId: "camp-menu-hook-sku::v2-rtu-flyer",
      dispatchId: "dd:camp-menu-hook-sku::v2-rtu-flyer",
    };
    const result = await invokeMenuDispatchHook({
      repoRoot: REPO,
      campaign: customerMenuCampaign("camp-menu-hook-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-menu-hook-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it(
    "invokes menu renderer from ready dd:{jobId} with customer truth; repeat is ALREADY_RENDERED",
    async () => {
      const campaignId = `camp-design-menu-dispatch-hook-1-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      const logoAbs = path.join(REPO, logoRel);
      mkdirSync(path.dirname(logoAbs), { recursive: true });
      writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readyMenuRecord(campaignId);
      expect(record.executionIdentityReady).toBe(true);

      const first = await invokeMenuDispatchHook({
        repoRoot: REPO,
        campaign: customerMenuCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });

      expect(first.ok).toBe(true);
      if (!first.ok) {
        // eslint-disable-next-line no-console
        console.error(first);
        return;
      }
      expect(first.dispatchId).toMatch(/^dd:/);
      expect(first.canvaRequired).toBe(false);
      expect(first.makeRequired).toBe(false);
      expect(first.ownerRoutineProduction).toBe("NONE");
      expect(first.invocationOutcome).toBe("RENDERED");
      expect(first.identity.itemCount).toBe(5);
      expect(first.identity.sectionCount).toBe(2);
      expect(first.identity.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(first.identity.pdfContentSha256).toMatch(/^[a-f0-9]{64}$/);

      const html = readFileSync(
        path.join(REPO, first.identity.htmlRelativePath),
        "utf8",
      );
      expect(html).not.toMatch(/CERTIFICATION FIXTURE/i);
      expect(html).not.toMatch(/saltandcedar\.example/i);
      expect(html).toContain("Maple Street");
      expect(html).toContain("Butter Croissant");
      expect(html).toContain("$3.75");

      const second = await invokeMenuDispatchHook({
        repoRoot: REPO,
        campaign: customerMenuCampaign(campaignId),
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
    "changed authoritative menu truth creates a new immutable version",
    async () => {
      const campaignId = `camp-design-menu-dispatch-ver-${Date.now()}`;
      const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
      const logoAbs = path.join(REPO, logoRel);
      mkdirSync(path.dirname(logoAbs), { recursive: true });
      writeFileSync(logoAbs, HARBOR_OAK_LOGO_SVG, "utf8");

      const record = readyMenuRecord(campaignId);
      const firstCampaign = customerMenuCampaign(campaignId);
      const first = await invokeMenuDispatchHook({
        repoRoot: REPO,
        campaign: firstCampaign,
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;

      const changedAnswers = {
        ...firstCampaign.routeMapIntake!.answers,
        menuStructuredJson: JSON.stringify({
          sections: [
            {
              title: "Pastries",
              items: [
                {
                  name: "Butter Croissant",
                  description: "Flaky laminated layers, baked daily.",
                  priceDisplay: "$3.95",
                },
                {
                  name: "Cinnamon Roll",
                  description: "Soft swirl with cream-cheese glaze.",
                  priceDisplay: "$4.25",
                },
                {
                  name: "Blueberry Muffin",
                  description: "Bursting berries, crumb topping.",
                  priceDisplay: "$3.50",
                },
              ],
            },
            {
              title: "Coffee",
              items: [
                {
                  name: "Drip Coffee",
                  description: "House blend, regular or decaf.",
                  priceDisplay: "$2.75",
                },
                {
                  name: "Cafe Latte",
                  description: "Espresso with silky steamed milk.",
                  priceDisplay: "$4.50",
                },
              ],
            },
          ],
        }),
      };
      const changed: CampaignRecord = {
        ...firstCampaign,
        routeMapIntake: {
          submittedAt: firstCampaign.routeMapIntake!.submittedAt,
          answers: changedAnswers,
        },
      };

      const second = await invokeMenuDispatchHook({
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
      expect(second.identity.designSpecFingerprint).not.toBe(
        first.identity.designSpecFingerprint,
      );
    },
    180_000,
  );
});
