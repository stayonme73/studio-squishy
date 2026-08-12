/**
 * STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { HARBOR_OAK_LOGO_SVG } from "@/lib/studio-design-renderer/fixtures";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { invokeDesignRendererDispatchHook } from "./design-renderer-hook";
import { evaluateJobDispatch } from "./evaluate";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");

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
    factFingerprint: "fp-idem",
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

function customerCampaign(
  campaignId: string,
  mustInclude?: string,
): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "Idempotency Lane Co",
    campaignStatus: "PAYMENT_RECEIVED",
    campaignDescription: "Idempotency fixture",
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
        flyerPurpose: "Neighborhood spring portraits",
        mustInclude:
          mustInclude ??
          "Spring Open House — portraits $99. April 12 – April 20, 2026. Call (804) 555-0199 or visit idem.example/open-house",
        materials: "Logo staged",
        intendedUse: "Both print and digital",
        disclaimers: "Appointments while available.",
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

function stageLogo(campaignId: string, svg = HARBOR_OAK_LOGO_SVG): string {
  const logoRel = `data/campaign-design-artifacts/${campaignId}/materials/logo.svg`;
  const abs = path.join(REPO, logoRel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, svg, "utf8");
  return logoRel;
}

function renderVersions(campaignId: string, dispatchId: string): number[] {
  const safe = dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const dir = path.join(
    REPO,
    "data/campaign-design-artifacts",
    campaignId,
    safe,
    "renders",
  );
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((n) => /^v(\d+)$/.exec(n)?.[1])
    .filter(Boolean)
    .map((n) => Number(n));
}

describe("STUDIO-OPERATING-DESIGN-DISPATCH-HOOK-IDEMPOTENCY-1", () => {
  it(
    "first render once; identical second returns ALREADY_RENDERED without new version",
    async () => {
      const campaignId = `camp-hook-idem-1-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");
      const v1 = first.identity.renderVersion;
      const hash1 = first.identity.pngContentSha256;
      const receipt1 = readFileSync(
        path.join(REPO, first.receiptRelativePath),
        "utf8",
      );

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(second.identity.renderVersion).toBe(v1);
      expect(second.identity.pngContentSha256).toBe(hash1);
      expect(second.identity.renderId).toBe(first.identity.renderId);

      const versions = renderVersions(campaignId, record.dispatchId);
      expect(versions.filter((v) => v === v1).length).toBe(1);
      expect(Math.max(...versions)).toBe(v1);

      // Historical receipt immutable
      expect(
        readFileSync(path.join(REPO, first.receiptRelativePath), "utf8"),
      ).toBe(receipt1);
    },
    180_000,
  );

  it(
    "changed design truth creates a new immutable version",
    async () => {
      const campaignId = `camp-hook-idem-change-spec-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(campaignId),
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(
          campaignId,
          "Autumn Open House — portraits $129. Oct 1 – Oct 15, 2026. Call (804) 555-0199 or visit idem.example/autumn",
        ),
        dispatchRecord: record,
        materials,
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
      expect(
        existsSync(path.join(REPO, first.receiptRelativePath)),
      ).toBe(true);
      expect(
        readFileSync(path.join(REPO, first.receiptRelativePath), "utf8"),
      ).toContain('"status": "success"');
    },
    180_000,
  );

  it(
    "changed materials create a new version",
    async () => {
      const campaignId = `camp-hook-idem-change-mat-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const materials = [approvedLogo(campaignId)];
      const campaign = customerCampaign(campaignId);

      const first = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      expect(first.invocationOutcome).toBe("RENDERED");

      writeFileSync(
        path.join(REPO, logoRel),
        HARBOR_OAK_LOGO_SVG.replace("#1F3A5F", "#102030"),
        "utf8",
      );

      const second = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
      });
      expect(second.ok).toBe(true);
      if (!second.ok) return;
      expect(second.invocationOutcome).toBe("RENDERED");
      expect(second.identity.renderVersion).toBeGreaterThan(
        first.identity.renderVersion,
      );
      expect(second.identity.materialFingerprint).not.toBe(
        first.identity.materialFingerprint,
      );
    },
    180_000,
  );

  it(
    "QA-failed prior render is not reusable PASS; retry may execute again",
    async () => {
      const campaignId = `camp-hook-idem-qa-fail-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const failed = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        forceQaFail: true,
      });
      expect(failed.ok).toBe(false);
      if (failed.ok) return;
      expect(failed.failureCode).toBe("QA_FAILURE");

      const retry = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials,
        stagedLogoRelativePath: logoRel,
        forceQaFail: false,
      });
      expect(retry.ok).toBe(true);
      if (!retry.ok) return;
      expect(retry.invocationOutcome).toBe("RENDERED");
    },
    180_000,
  );

  it(
    "partial PNG-without-identity fails closed",
    async () => {
      const campaignId = `camp-hook-idem-partial-${Date.now()}`;
      const record = readyFlyerRecord(campaignId);
      const safe = record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_");
      const partialPng = path.join(
        REPO,
        "data/campaign-design-artifacts",
        campaignId,
        safe,
        "renders/v1/flyer.png",
      );
      mkdirSync(path.dirname(partialPng), { recursive: true });
      writeFileSync(partialPng, Buffer.from([1, 2, 3, 4]));

      const logoRel = stageLogo(campaignId);
      const result = await invokeDesignRendererDispatchHook({
        repoRoot: REPO,
        campaign: customerCampaign(campaignId),
        dispatchRecord: record,
        materials: [approvedLogo(campaignId)],
        stagedLogoRelativePath: logoRel,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.failureCode).toBe("PARTIAL_RENDER_STATE");
    },
    60_000,
  );

  it(
    "concurrent identical invokes cannot mint two successful identities",
    async () => {
      const campaignId = `camp-hook-idem-concurrent-${Date.now()}`;
      const logoRel = stageLogo(campaignId);
      const record = readyFlyerRecord(campaignId);
      const campaign = customerCampaign(campaignId);
      const materials = [approvedLogo(campaignId)];

      const [a, b] = await Promise.all([
        invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        }),
        invokeDesignRendererDispatchHook({
          repoRoot: REPO,
          campaign,
          dispatchRecord: record,
          materials,
          stagedLogoRelativePath: logoRel,
        }),
      ]);

      const oks = [a, b].filter((r) => r.ok);
      expect(oks.length).toBeGreaterThanOrEqual(1);
      const rendered = oks.filter(
        (r) => r.ok && r.invocationOutcome === "RENDERED",
      );
      expect(rendered.length).toBeLessThanOrEqual(1);

      if (oks.length === 2 && oks[0]!.ok && oks[1]!.ok) {
        expect(oks[0].identity.renderId).toBe(oks[1].identity.renderId);
        expect(oks[0].identity.pngContentSha256).toBe(
          oks[1].identity.pngContentSha256,
        );
      }

      const versions = renderVersions(campaignId, record.dispatchId);
      const successVersions = versions.filter((v) => {
        const receiptPath = path.join(
          REPO,
          "data/campaign-design-artifacts",
          campaignId,
          record.dispatchId.replace(/[^a-zA-Z0-9_-]+/g, "_"),
          `renders/v${v}/dispatch-hook-receipt.json`,
        );
        if (!existsSync(receiptPath)) return false;
        const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
          status?: string;
        };
        return receipt.status === "success";
      });
      expect(successVersions.length).toBe(1);
    },
    180_000,
  );

  it("still refuses non-flyer SKUs (menu uses its own hook, not flyer hook)", async () => {
    const menu = resolveServiceProductionContract("v2-rtu-menu");
    expect(menu.status).toBe("resolved");
    if (menu.status === "resolved") {
      expect(menu.contract.primaryTool.toolId).toBe("studio_design_renderer");
    }

    const record = readyFlyerRecord("camp-hook-idem-sku");
    const bad = {
      ...record,
      skuId: "v2-rtu-menu" as const,
      jobId: "camp-hook-idem-sku::v2-rtu-menu",
      dispatchId: "dd:camp-hook-idem-sku::v2-rtu-menu",
    };
    const result = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: customerCampaign("camp-hook-idem-sku"),
      dispatchRecord: bad,
      materials: [approvedLogo("camp-hook-idem-sku")],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it("not-ready dispatch still rejected", async () => {
    const campaignId = "camp-hook-idem-not-ready";
    const record = {
      ...readyFlyerRecord(campaignId),
      executionIdentityReady: false,
      status: "WAITING_FOR_PREREQUISITE" as const,
    };
    const result = await invokeDesignRendererDispatchHook({
      repoRoot: REPO,
      campaign: customerCampaign(campaignId),
      dispatchRecord: record,
      materials: [approvedLogo(campaignId)],
      stagedLogoRelativePath: stageLogo(campaignId),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("DISPATCH_NOT_READY");
  });
});
