/**
 * STUDIO-OPERATING-GENERAL-DESIGN-RUNTIME-1
 * Package C: ordinary paid customer → Machine wake → general Design Production.
 * No Maya. No Harbor/Nia/Cedar runtime identity.
 */

import { readFileSync, rmSync } from "fs";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "fs";

import type { CampaignRecord } from "@/config/studio-board";
import {
  CERTIFICATION_VISUAL_LEAK_PATTERNS,
  GENERAL_DESIGN_LAUNCH_SKUS,
  GENERAL_DESIGN_SKU_LAUNCH_ROLE,
  studioGeneralDesignRuntimeV1,
} from "@/config/studio-general-design-runtime-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import { sanitizeCustomerDisclaimer } from "@/lib/studio-design-renderer/customer-facing-creative-copy";
import { PROMO_INTAKE_PLATE_OPTIONS } from "@/lib/studio-design-renderer";

import {
  buildClearedCustomerLogoMaterial,
  stageGenericCustomerLogoPng,
} from "./cleared-customer-logo";
import { ensureDispatchExecution } from "./ensure";
import { invokePromoDispatchHook } from "./promo-dispatch-hook";
import { evaluateJobDispatch } from "./evaluate";
import { flattenSkuIntakeAnswers } from "./sku-intake-answers";
import { mapPromoProjectTruthFromJob } from "./map-promo-job-truth";
import { mapBusinessCardProjectTruthFromJob } from "./map-business-card-job-truth";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");

const SQUARE_PLATE = PROMO_INTAKE_PLATE_OPTIONS[0];
const PORTRAIT_PLATE = PROMO_INTAKE_PLATE_OPTIONS[1];

function leakScan(text: string): string | null {
  for (const pattern of CERTIFICATION_VISUAL_LEAK_PATTERNS) {
    if (pattern.test(text)) return pattern.source;
  }
  return null;
}

function leakScanCustomerFacing(input: {
  businessName?: string;
  offerName?: string;
  body?: string;
  disclaimer?: string;
  personName?: string;
  phone?: string;
  webDisplay?: string;
}): string | null {
  return leakScan(
    [
      input.businessName,
      input.offerName,
      input.body,
      input.disclaimer,
      input.personName,
      input.phone,
      input.webDisplay,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function paidCampaign(
  campaignId: string,
  skuId: string,
  campaignName: string,
  answers: Record<string, string>,
): CampaignRecord {
  const now = new Date().toISOString();
  const skus = [skuId] as const;
  const totals = computePlanPricingTotals([...skus]);
  return {
    campaignId,
    campaignName,
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Package C general design cert",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    paymentReceivedAt: now,
    paymentTruth: {
      processor: "stripe",
      status: "confirmed",
      currency: "usd",
      expectedAmountCents: totals.amountDueTodayCents,
      confirmedAmountCents: totals.amountDueTodayCents,
      checkoutSessionId: `cs_pkgc_${campaignId}`,
      paymentIntentId: `pi_pkgc_${campaignId}`,
      stripeEventId: `evt_pkgc_${campaignId}`,
      selectedServiceIds: [...skus],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [...skus],
      includedServiceIds: [...skus],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([...skus]),
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: { submittedAt: now, answers },
  };
}

async function seedClearedLogo(campaignId: string, skuId: string): Promise<string> {
  const now = new Date().toISOString();
  const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
  const item = buildClearedCustomerLogoMaterial({
    campaignId,
    skuId,
    stagedRelativePath: staged,
  });
  expect(item.contentCertification?.routingState).toMatch(
    /CLEARED_FOR_PRODUCTION|CLEARED_WITH_LIMITS/,
  );
  await writeMaterialsEnvelope({
    campaignId,
    items: [item],
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
  return staged;
}

async function expectReviewEligible(campaignId: string, skuId: string): Promise<void> {
  const tasks = await readTasksEnvelope(campaignId);
  const job = tasks?.jobRecords?.find((entry) => entry.skuId === skuId);
  const dump = JSON.stringify({
    spineStatus: job?.spineStatus,
    authorization: job?.internalQaReviewAuthorization,
    qaActions: (tasks?.qaRecords ?? [])
      .filter((record) => record.taskId.includes(skuId))
      .map((record) => ({
        taskId: record.taskId,
        action: record.action,
        hashes: record.artifactBinding?.contentSha256s,
        designGate: record.designQualityEvidence?.gatePassed,
      })),
    taskIds: (tasks?.tasks ?? [])
      .filter((task) => task.relatedServiceIds.includes(skuId as never))
      .map((task) => task.id),
  });
  expect(job, `missing job spine for ${skuId}: ${dump}`).toBeTruthy();
  expect(job?.spineStatus, dump).toBe("ready_for_review");
  expect(job?.internalQaReviewAuthorization?.status, dump).toBe(
    "ELIGIBLE_FOR_REVIEW",
  );
}

async function cleanup(campaignId: string): Promise<void> {
  await Promise.all([
    fs.unlink(path.join(CAMPAIGNS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(TASKS_DIR, `${campaignId}.json`)).catch(() => undefined),
    fs.unlink(path.join(MATERIALS_DIR, `${campaignId}.json`)).catch(() => undefined),
  ]);
  rmSync(path.join(REPO, "data", "campaign-design-artifacts", campaignId), {
    recursive: true,
    force: true,
  });
}

describe("STUDIO-OPERATING-GENERAL-DESIGN-RUNTIME-1 unit", () => {
  it("does not expand the launch menu and keeps print digital-only", () => {
    expect(studioGeneralDesignRuntimeV1.doNotTouchMaya).toBe(true);
    expect(studioGeneralDesignRuntimeV1.doNotExpandLaunchMenu).toBe(true);
    expect(studioGeneralDesignRuntimeV1.printFulfillment).toBe("DIGITAL_FILES_ONLY");
    expect(studioGeneralDesignRuntimeV1.socialPostsPlate).toBe("square_only");
    expect(GENERAL_DESIGN_LAUNCH_SKUS).toEqual([
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
    ]);
    expect(GENERAL_DESIGN_SKU_LAUNCH_ROLE["v2-rtu-handout"]).toBe("held_from_launch");
  });

  it("flattens live prefixed intake keys for ordinary customers", () => {
    const skuId = "v2-rtu-promotion-graphics";
    const flat = flattenSkuIntakeAnswers(
      {
        [`${skuId}:campaignFocus`]: "Open Studio Saturday",
        [`${skuId}:mustInclude`]: "Wheel seats $35. Call (804) 555-0177 · riverandreed.example",
        "shared:materials": "Logo on file",
      },
      skuId,
    );
    expect(flat.campaignFocus).toBe("Open Studio Saturday");
    expect(flat.mustInclude).toMatch(/\$35/);
    expect(flat.materials).toBe("Logo on file");
  });

  it("strips catalog distribution chrome from customer disclaimers", () => {
    const cleaned = sanitizeCustomerDisclaimer(
      "While appointments remain. Finished graphics — you distribute.",
    );
    expect(cleaned).toBe("While appointments remain.");
    expect(cleaned).not.toMatch(/you distribute/i);
  });

  it("maps prefixed promo intake without Harbor/Nia/Cedar identity", () => {
    const campaignId = "camp-pkgc-map-promo";
    const skuId = "v2-rtu-promotion-graphics";
    const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
    const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
      [`${skuId}:campaignFocus`]: "Open Studio Saturday — wheel-throwing seats.",
      [`${skuId}:mustInclude`]:
        "Open Studio Saturday $35. April 12 – April 20, 2026. Call (804) 555-0177 · riverandreed.example/open-studio",
      [`${skuId}:dates`]: "April 12 – April 20, 2026",
      [`${skuId}:callToAction`]: "Call (804) 555-0177 or visit riverandreed.example/open-studio",
      [`${skuId}:graphicA_authorizedPurpose`]: "Social",
      [`${skuId}:graphicA_agreedPlate`]: SQUARE_PLATE,
      [`${skuId}:graphicB_authorizedPurpose`]: "Print",
      [`${skuId}:graphicB_agreedPlate`]: PORTRAIT_PLATE,
      [`${skuId}:disclaimers`]: "While seats remain.",
      "shared:materials": "Logo on file",
    });
    const jobId = `${campaignId}::${skuId}`;
    const record = evaluateJobDispatch({
      campaignId,
      jobId,
      skuId: skuId as JobDispatchRecord["skuId"],
      routing: {
        decisionId: `rd:${jobId}`,
        jobId,
        campaignId,
        skuId: skuId as JobDispatchRecord["skuId"],
        status: "READY_FOR_DISPATCH",
        readyForDispatch: true,
        productionFamilyId: "marketing_assets",
        controlLane: "standard",
        factFingerprint: "fp-pkgc",
        capabilityReadiness: "contract_ready",
        evaluatedAt: new Date().toISOString(),
        reason: null,
        blocker: null,
        ownerActionRequired: false,
      },
    });
    const mapped = mapPromoProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [
        buildClearedCustomerLogoMaterial({
          campaignId,
          skuId,
          stagedRelativePath: staged,
        }),
      ],
      stagedLogoRelativePath: staged,
    });
    expect(mapped.ok, mapped.ok ? "ok" : mapped.message).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.outputMode).toBe("customer");
    expect(mapped.truth.businessName).toMatch(/River Reed/i);
    expect(mapped.truth.offerName).not.toMatch(/Tune-Up/i);
    expect(leakScanCustomerFacing(mapped.truth)).toBeNull();
    expect(mapped.truth.assets[0]!.plateId).toMatch(/square/i);
    expect(mapped.truth.assets[1]!.plateId).toMatch(/portrait/i);
  });

  it("maps prefixed business-card intake for an ordinary customer", () => {
    const campaignId = "camp-pkgc-map-card";
    const skuId = "v2-rtu-business-card";
    const staged = stageGenericCustomerLogoPng({ repoRoot: REPO, campaignId });
    const campaign = paidCampaign(campaignId, skuId, "Moss Thread Studio", {
      [`${skuId}:businessName`]: "Moss Thread Studio",
      [`${skuId}:cardNameTitle`]: "Jordan Hale · Studio Owner",
      [`${skuId}:phone`]: "(804) 555-0166",
      [`${skuId}:email`]: "jordan@mossthread.example",
      [`${skuId}:webOrSocial`]: "mossthread.example",
      [`${skuId}:brandMaterials`]: "Logo on file",
    });
    const jobId = `${campaignId}::${skuId}`;
    const record = evaluateJobDispatch({
      campaignId,
      jobId,
      skuId: skuId as JobDispatchRecord["skuId"],
      routing: {
        decisionId: `rd:${jobId}`,
        jobId,
        campaignId,
        skuId: skuId as JobDispatchRecord["skuId"],
        status: "READY_FOR_DISPATCH",
        readyForDispatch: true,
        productionFamilyId: "marketing_assets",
        controlLane: "standard",
        factFingerprint: "fp-pkgc-card",
        capabilityReadiness: "contract_ready",
        evaluatedAt: new Date().toISOString(),
        reason: null,
        blocker: null,
        ownerActionRequired: false,
      },
    });
    const mapped = mapBusinessCardProjectTruthFromJob({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [
        buildClearedCustomerLogoMaterial({
          campaignId,
          skuId,
          stagedRelativePath: staged,
        }),
      ],
      stagedLogoRelativePath: staged,
    });
    expect(mapped.ok, mapped.ok ? "ok" : mapped.message).toBe(true);
    if (!mapped.ok) return;
    expect(mapped.truth.personName).toBe("Jordan Hale");
    expect(leakScanCustomerFacing(mapped.truth)).toBeNull();
  });
});

describe("STUDIO-OPERATING-GENERAL-DESIGN-RUNTIME-1 paid Machine", () => {
  const ids: string[] = [];

  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it(
    "ordinary River Reed promo job wakes Design Production without Scout or Harbor DNA",
    async () => {
      const campaignId = `pkgc-promo-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-promotion-graphics";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
        [`${skuId}:campaignFocus`]: "Open Studio Saturday — wheel-throwing seats.",
        [`${skuId}:mustInclude`]:
          "Open Studio Saturday $35. April 12 – April 20, 2026. Call (804) 555-0177 · riverandreed.example/open-studio",
        [`${skuId}:dates`]: "April 12 – April 20, 2026",
        [`${skuId}:callToAction`]:
          "Call (804) 555-0177 or visit riverandreed.example/open-studio",
        [`${skuId}:graphicA_authorizedPurpose`]: "Social",
        [`${skuId}:graphicA_agreedPlate`]: SQUARE_PLATE,
        [`${skuId}:graphicB_authorizedPurpose`]: "Print",
        [`${skuId}:graphicB_agreedPlate`]: PORTRAIT_PLATE,
        [`${skuId}:disclaimers`]: "While seats remain.",
        "shared:materials": "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);

      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const record = first.dispatch.records.find((row) => rSku(row, skuId));
      expect(record?.executionIdentityReady).toBe(true);
      expect(record?.requirements?.primaryTool.toolId).toBe("studio_design_renderer");
      const obs = first.designRendererObserver?.results.find((row) => row.skuId === skuId);
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok, obs?.message).toBe(true);
      expect(obs?.invocationOutcome).toBe("RENDERED");
      expect(obs?.pngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(obs?.backPngContentSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(obs?.pngContentSha256).not.toBe(obs?.backPngContentSha256);

      const htmlFiles = await collectHtml(
        path.join(REPO, "data", "campaign-design-artifacts", campaignId),
      );
      expect(htmlFiles.length).toBeGreaterThan(0);
      for (const html of htmlFiles) {
        expect(leakScan(html)).toBeNull();
        expect(html).toContain("$35");
        expect(html).not.toMatch(/You distribute/i);
        expect(html).not.toMatch(/Tune-Up/i);
      }

      expect(first.campaign.campaignStatus).toBe("READY_FOR_REVIEW");
      await expectReviewEligible(campaignId, skuId);
    },
    240_000,
  );

  it(
    "chrome disclaimer fails QA then Machine correction remints without Scout editing",
    async () => {
      const campaignId = `pkgc-promo-correct-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-promotion-graphics";
      const campaign = paidCampaign(campaignId, skuId, "Lumen Bicycle Co", {
        [`${skuId}:campaignFocus`]: "Spring tune season — shop hours for commuters.",
        [`${skuId}:mustInclude`]:
          "Spring Service $89. March 1 – April 30, 2026. Call (804) 555-0133 · lumenbike.example/service",
        [`${skuId}:dates`]: "March 1 – April 30, 2026",
        [`${skuId}:callToAction`]: "Call (804) 555-0133 or visit lumenbike.example/service",
        [`${skuId}:graphicA_authorizedPurpose`]: "Social",
        [`${skuId}:graphicA_agreedPlate`]: SQUARE_PLATE,
        [`${skuId}:graphicB_authorizedPurpose`]: "Print",
        [`${skuId}:graphicB_agreedPlate`]: PORTRAIT_PLATE,
        [`${skuId}:disclaimers`]:
          "While appointments remain. Finished graphics — you distribute.",
        "shared:materials": "Logo on file",
      });
      const staged = await seedClearedLogo(campaignId, skuId);
      const jobId = `${campaignId}::${skuId}`;
      const record = evaluateJobDispatch({
        campaignId,
        jobId,
        skuId: skuId as JobDispatchRecord["skuId"],
        routing: {
          decisionId: `rd:${jobId}`,
          jobId,
          campaignId,
          skuId: skuId as JobDispatchRecord["skuId"],
          status: "READY_FOR_DISPATCH",
          readyForDispatch: true,
          productionFamilyId: "marketing_assets",
          controlLane: "standard",
          factFingerprint: "fp-pkgc-correct",
          capabilityReadiness: "contract_ready",
          evaluatedAt: new Date().toISOString(),
          reason: null,
          blocker: null,
          ownerActionRequired: false,
        },
      });
      const hooked = await invokePromoDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials: [
          buildClearedCustomerLogoMaterial({
            campaignId,
            skuId,
            stagedRelativePath: staged,
          }),
        ],
        stagedLogoRelativePath: staged,
      });
      expect(hooked.ok, hooked.ok ? "ok" : `${hooked.failureCode}: ${hooked.message}`).toBe(
        true,
      );
      if (!hooked.ok) return;
      expect(hooked.generalDesignLoop?.attempts.length).toBeGreaterThanOrEqual(2);
      expect(hooked.generalDesignLoop?.attempts[0]?.qaResult).toBe("fail");
      expect(hooked.generalDesignLoop?.attempts[0]?.failureCode).toBe("FIXTURE_LEAKAGE");
      expect(hooked.generalDesignLoop?.attempts.some((row) => row.qaResult === "pass")).toBe(
        true,
      );
      expect(hooked.identity.assets[0]!.widthPx).toBe(1024);
      expect(hooked.identity.assets[0]!.heightPx).toBe(1024);
      expect(hooked.identity.assets[1]!.widthPx).toBe(1024);
      expect(hooked.identity.assets[1]!.heightPx).toBe(1536);
      expect(hooked.identity.assets[0]!.pngContentSha256).not.toBe(
        hooked.identity.assets[1]!.pngContentSha256,
      );
      expect(hooked.identity.setQaOk).toBe(true);
      const htmlA = readFileSync(
        path.join(REPO, hooked.identity.assets[0]!.htmlRelativePath),
        "utf8",
      );
      const htmlB = readFileSync(
        path.join(REPO, hooked.identity.assets[1]!.htmlRelativePath),
        "utf8",
      );
      expect(leakScan(htmlA)).toBeNull();
      expect(leakScan(htmlB)).toBeNull();
      expect(htmlA).not.toMatch(/You distribute/i);
      expect(htmlB).not.toMatch(/You distribute/i);
    },
    240_000,
  );

  it(
    "ordinary Moss Thread card job is Machine-invoked from paid wake",
    async () => {
      const campaignId = `pkgc-card-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-business-card";
      const campaign = paidCampaign(campaignId, skuId, "Moss Thread Studio", {
        [`${skuId}:businessName`]: "Moss Thread Studio",
        [`${skuId}:cardNameTitle`]: "Jordan Hale · Studio Owner",
        [`${skuId}:phone`]: "(804) 555-0166",
        [`${skuId}:email`]: "jordan@mossthread.example",
        [`${skuId}:webOrSocial`]: "mossthread.example",
        [`${skuId}:brandMaterials`]: "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.dispatch.records.find((row) => rSku(row, skuId));
      expect(record?.executionIdentityReady).toBe(true);
      expect(record?.requirements?.primaryTool.toolId).toBe("studio_design_renderer");
      const obs = result.designRendererObserver?.results.find((row) => row.skuId === skuId);
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok, obs?.message).toBe(true);
      expect(obs?.pngContentSha256).not.toBe(obs?.backPngContentSha256);
      expect(result.campaign.campaignStatus).toBe("READY_FOR_REVIEW");
      await expectReviewEligible(campaignId, skuId);
    },
    180_000,
  );

  it(
    "ordinary menu job produces digital print-ready files only",
    async () => {
      const campaignId = `pkgc-menu-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-menu";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery Cafe", {
        [`${skuId}:businessName`]: "River Reed Pottery Cafe",
        [`${skuId}:businessType`]: "Cafe",
        [`${skuId}:dietaryLabels`]: "Contains gluten and dairy. Customer-verified wording.",
        [`${skuId}:disclaimers`]: "Prices may change with clay and kiln schedule.",
        [`${skuId}:materials`]: "Logo on file",
        [`${skuId}:intendedUse`]: "Both print and digital",
        [`${skuId}:sections`]: "Pastries\nDrinks",
        [`${skuId}:items`]:
          "Pastries | Butter Croissant | Flaky layers. | $3.75\nPastries | Clay Cookie | Seasonal. | $2.50\nDrinks | Drip Coffee | House brew. | $2.75\nDrinks | Tea | Pot. | $3.00",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.dispatch.records.find((row) => rSku(row, skuId));
      expect(record?.executionIdentityReady).toBe(true);
      const obs = result.designRendererObserver?.results.find((row) => row.skuId === skuId);
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok, obs?.message).toBe(true);
      const htmlFiles = await collectHtml(
        path.join(REPO, "data", "campaign-design-artifacts", campaignId),
      );
      expect(htmlFiles.some((html) => /Butter Croissant|Drip Coffee/.test(html))).toBe(true);
      for (const html of htmlFiles) {
        expect(leakScan(html)).toBeNull();
        expect(html).not.toMatch(/shipping|we print|fulfillment vendor/i);
      }
      expect(result.campaign.campaignStatus).toBe("READY_FOR_REVIEW");
      await expectReviewEligible(campaignId, skuId);
    },
    180_000,
  );

  it(
    "ordinary service-sheet job is Machine-invoked from paid wake",
    async () => {
      const campaignId = `pkgc-sheet-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-service-sheet";
      const campaign = paidCampaign(campaignId, skuId, "Lumen Bicycle Co", {
        [`${skuId}:businessName`]: "Lumen Bicycle Co",
        [`${skuId}:businessType`]: "Bike shop",
        [`${skuId}:contactDetails`]: "Call (804) 555-0133 · lumenbike.example",
        [`${skuId}:wording`]: "Starting prices shown where listed.",
        [`${skuId}:materials`]: "Logo on file",
        [`${skuId}:services`]:
          "Tune | Seasonal check. | listed | $89\nWheel True | Spoke work. | listed | $45\nCustom Build | Scoped. | omitted",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.dispatch.records.find((row) => rSku(row, skuId));
      expect(record?.executionIdentityReady).toBe(true);
      const obs = result.designRendererObserver?.results.find((row) => row.skuId === skuId);
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok, obs?.message).toBe(true);
      expect(result.campaign.campaignStatus).toBe("READY_FOR_REVIEW");
      await expectReviewEligible(campaignId, skuId);
    },
    180_000,
  );

  it(
    "ordinary social-posts job is square-only Machine production",
    async () => {
      const campaignId = `pkgc-social-${Date.now()}`;
      ids.push(campaignId);
      const skuId = "v2-rtu-social-posts";
      const campaign = paidCampaign(campaignId, skuId, "River Reed Pottery", {
        [`${skuId}:socialPostsPurposeChoice`]: "Promote an offer",
        [`${skuId}:socialPostsActionChoice`]: "Book now",
        [`${skuId}:socialPostsPlatformChoice`]: "Instagram Post",
        [`${skuId}:postsAbout`]:
          "Promote an offer — Open Studio Saturday $35. April 12 – April 20, 2026.",
        [`${skuId}:callToAction`]:
          "Book now — (804) 555-0177 · riverandreed.example/open-studio",
        [`${skuId}:platform`]: "Instagram Post — Square or portrait feed graphic",
        [`${skuId}:wordingHashtags`]: "No required wording.",
        "shared:materials": "Logo on file",
      });
      await upsertCampaignRecord(campaign);
      await seedClearedLogo(campaignId, skuId);
      const result = await ensureDispatchExecution(campaign);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const record = result.dispatch.records.find((row) => rSku(row, skuId));
      expect(record?.executionIdentityReady).toBe(true);
      const obs = result.designRendererObserver?.results.find((row) => row.skuId === skuId);
      expect(obs?.action).toBe("invoked");
      expect(obs?.ok, obs?.message).toBe(true);
      const htmlFiles = await collectHtml(
        path.join(REPO, "data", "campaign-design-artifacts", campaignId),
      );
      for (const html of htmlFiles) {
        expect(leakScan(html)).toBeNull();
        expect(html).not.toMatch(/Stories|vertical 1080/i);
      }
      expect(result.campaign.campaignStatus).toBe("READY_FOR_REVIEW");
      await expectReviewEligible(campaignId, skuId);
    },
    240_000,
  );
});

function rSku(row: { skuId: string }, skuId: string): boolean {
  return row.skuId === skuId;
}

async function collectHtml(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const abs = path.join(dir, name);
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) await walk(abs);
      else if (name.endsWith(".html")) out.push(await fs.readFile(abs, "utf8"));
    }
  }
  await walk(root);
  return out;
}
