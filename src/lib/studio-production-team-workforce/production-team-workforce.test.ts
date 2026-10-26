/**
 * STUDIO-OPERATING-PRODUCTION-TEAM-WORKFORCE-1
 * Machine-managed Production Team behind the launch menu.
 * Maya stays frozen. Scout does not produce customer work in this cert.
 */

import { mkdirSync, mkdtempSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  MAYA_PROTECTED_CAMPAIGN_ID,
  studioProductionTeamWorkforceV1,
} from "@/config/studio-production-team-workforce-v1";
import { needsFlyerProductionObserverRetry } from "@/lib/project-intake-flyer-production";
import { assembleCopyFromFacts, writeCopyFromFacts } from "@/lib/studio-copy-production";
import { invokeCopyDispatchHook } from "@/lib/studio-dispatch/copy-dispatch-hook";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import { invokeShortVideoDispatchHook } from "@/lib/studio-dispatch/short-video-dispatch-hook";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";
import {
  assignmentForSku,
  classifyProductionAttempt,
  certifyPrintFileDeliverable,
  freezeMayaFlyerToVersion16,
  isProductionFrozen,
  launchMenuRoster,
  recordMachineProductionPass,
  readProductionTeamLog,
} from "@/lib/studio-production-team-workforce";

const REPO = path.resolve(__dirname, "../../..");

function readyRecord(campaignId: string, skuId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${skuId}`;
  const routing = {
    decisionId: `rd:${jobId}`,
    jobId,
    campaignId,
    skuId: skuId as JobDispatchRecord["skuId"],
    status: "READY_FOR_DISPATCH" as const,
    readyForDispatch: true,
    productionFamilyId: "marketing_assets" as const,
    controlLane: "standard" as const,
    factFingerprint: `fp-${skuId}`,
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
    skuId: skuId as JobDispatchRecord["skuId"],
  });
}

function millwrightCampaign(
  campaignId: string,
  skuIds: readonly string[],
): CampaignRecord {
  const now = new Date().toISOString();
  const answers: Record<string, string> = {};
  for (const skuId of skuIds) {
    if (skuId === "v2-rtu-email-kit") {
      answers[`${skuId}:campaignGoal`] = "Spring millwright open house";
      answers[`${skuId}:mustInclude`] =
        "Walk-in sharpening $45. Call (616) 555-0142 or visit millwrightandco.example";
      answers[`${skuId}:callToAction`] = "Call (616) 555-0142";
      answers[`${skuId}:listConsent`] = "Yes — I own the list and have consent";
      answers[`${skuId}:sendingAccount`] = "Mailchimp";
      answers[`${skuId}:mustNotSay`] = "guaranteed lifetime edge";
    }
    if (skuId === "v2-rtu-menu") {
      answers[`${skuId}:businessName`] = "Millwright & Co.";
      answers[`${skuId}:menuSections`] = "Sharpening\nWalk-in $45";
    }
    if (skuId === "v2-rtu-short-video") {
      answers[`${skuId}:videoPurpose`] = "Open house walk-through";
      answers[`${skuId}:onScreenText`] = "Walk-in sharpening $45. Call (616) 555-0142.";
      answers[`${skuId}:format`] = "Vertical";
    }
  }
  return {
    campaignId,
    campaignName: "Millwright & Co.",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Workforce cert — ordinary non-Maya customer",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: { submittedAt: now, answers },
  };
}

describe("STUDIO-OPERATING-PRODUCTION-TEAM-WORKFORCE-1", () => {
  it("protects Maya, refunds, Room 5, merge, and Scout-as-producer", () => {
    expect(studioProductionTeamWorkforceV1.doNotTouchMaya).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotMintMayaVersion17).toBe(true);
    expect(studioProductionTeamWorkforceV1.mayaFrozenVersion).toBe(16);
    expect(studioProductionTeamWorkforceV1.mayaRevisionUsed).toBe(1);
    expect(studioProductionTeamWorkforceV1.mayaRevisionRemaining).toBe(0);
    expect(studioProductionTeamWorkforceV1.doNotApprove).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotStartFinalApproval).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotStartFinalDelivery).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotReopenRefunds).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotStartRoom5).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotMerge).toBe(true);
    expect(studioProductionTeamWorkforceV1.doNotPush).toBe(true);
    expect(studioProductionTeamWorkforceV1.scoutIsNotCustomerProducer).toBe(true);
    expect(MAYA_PROTECTED_CAMPAIGN_ID).toBe(
      "716a15b6-d8d6-436c-8f84-9e8b40d2f959",
    );
  });

  it("maps every currently sold launch-menu SKU to a callable capability or honest HOLD", () => {
    const roster = launchMenuRoster();
    const sold = [
      "v2-rtu-flyer",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
      "v2-rtu-email-kit",
      "v2-rtu-sms-kit",
      "v2-rtu-short-video",
    ];
    for (const skuId of sold) {
      const row = assignmentForSku(skuId);
      expect(row.capability, skuId).toBeTruthy();
      expect(["READY", "READY_WITH_LIMITS"]).toContain(row.classification);
    }
    expect(assignmentForSku("v2-rtu-voice").classification).toBe("HOLD");
    expect(assignmentForSku("v2-rtu-voice").capability).toBeNull();
    expect(assignmentForSku("cc-001").classification).toBe("HOLD");
    expect(assignmentForSku("carousel").classification).toBe("NOT_ON_LAUNCH_MENU");
    expect(roster.some((row) => row.skuId === "v2-rtu-flyer")).toBe(true);
  });

  it("keeps customer revision, Studio correction, and internal retry distinguishable", () => {
    expect(
      classifyProductionAttempt({
        customerChangedDirection: true,
        studioFailedExistingDirection: false,
        internalProductionQaRetry: false,
      }),
    ).toBe("customer_revision");
    expect(
      classifyProductionAttempt({
        customerChangedDirection: false,
        studioFailedExistingDirection: true,
        internalProductionQaRetry: false,
      }),
    ).toBe("studio_correction");
    expect(
      classifyProductionAttempt({
        customerChangedDirection: false,
        studioFailedExistingDirection: false,
        internalProductionQaRetry: true,
      }),
    ).toBe("internal_retry");
  });

  it("Copy Production writes from facts and does not invent offers or prices", () => {
    const facts = {
      skuId: "v2-rtu-email-kit" as const,
      businessName: "Millwright & Co.",
      campaignGoal: "Spring millwright open house",
      mustInclude:
        "Walk-in sharpening $45. Call (616) 555-0142 or visit millwrightandco.example",
      callToAction: "Call (616) 555-0142",
      compliance: "Reply STOP to opt out.",
      mustNotSay: "guaranteed lifetime edge",
      messageCopy: "",
      sendingAccount: "Mailchimp",
      listConsent: "Yes — I own the list and have consent",
    };
    const assembled = assembleCopyFromFacts(facts);
    const written = writeCopyFromFacts(facts);
    expect(written.ok).toBe(true);
    if (!written.ok || !assembled.ok) return;
    const blob = JSON.stringify(written.submission);
    expect(blob).toContain("$45");
    expect(blob).toContain("(616) 555-0142");
    expect(blob).not.toMatch(/guaranteed lifetime edge|50% off|lifetime warranty/i);
    expect(blob.toLowerCase()).toContain("next step");
    expect(JSON.stringify(assembled.submission).toLowerCase()).not.toContain(
      "next step",
    );
  });

  it("Machine copy hook produces for an ordinary non-Maya customer", async () => {
    const campaignId = `camp-workforce-millwright-copy-${Date.now()}`;
    const campaign = millwrightCampaign(campaignId, ["v2-rtu-email-kit"]);
    const record = readyRecord(campaignId, "v2-rtu-email-kit");
    const produced = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(produced.ok, produced.ok ? "ok" : `${produced.failureCode}: ${produced.message}`).toBe(
      true,
    );
    if (!produced.ok) return;
    expect(produced.evidence.gatePassed).toBe(true);
    expect(produced.artifactRelativePath).toContain(campaignId);
  });

  it("Print/File Production certifies digital files and never ships", () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), "pt-print-"));
    const pngRel = "out/flyer.png";
    const pdfRel = "out/flyer.pdf";
    mkdirSync(path.join(tmp, "out"));
    writeFileSync(path.join(tmp, pngRel), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]));
    writeFileSync(path.join(tmp, pdfRel), Buffer.from("%PDF-1.4\n"));
    const certified = certifyPrintFileDeliverable({
      repoRoot: tmp,
      skuId: "v2-rtu-flyer",
      pngRelativePath: pngRel,
      pdfRelativePath: pdfRel,
      intendedUse: "Both print and digital",
    });
    expect(certified.ok).toBe(true);
    if (!certified.ok) return;
    expect(certified.physicalPrint).toBe(false);
    expect(certified.shipping).toBe(false);
  });

  it("frozen Maya cannot wake flyer remint", () => {
    const frozen: CampaignRecord = {
      ...millwrightCampaign("not-maya", ["v2-rtu-flyer"]),
      campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
      productionFreeze: {
        packageId: studioProductionTeamWorkforceV1.packageId,
        status: "FROZEN",
        reason: "OWNER_DIRECTIVE_MAYA_PARKED_VERSION_16",
        skuIds: ["v2-rtu-flyer"],
        workVersionId: "flyer-v16",
        renderVersion: 16,
        pngContentSha256: "deadbeef",
        doNotRemint: true,
        frozenAt: new Date().toISOString(),
      },
      dispatchExecution: {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: "cs_test",
        records: [],
        ownerActionRequired: false,
        designRendererObserver: {
          packageId: "STUDIO-OPERATING-DESIGN-DISPATCH-OBSERVER-1",
          observedAt: new Date().toISOString(),
          campaignId: MAYA_PROTECTED_CAMPAIGN_ID,
          results: [
            {
              dispatchId: "dd:maya:v2-rtu-flyer",
              skuId: "v2-rtu-flyer",
              action: "invoked",
              ok: true,
              invocationOutcome: "ALREADY_RENDERED",
              renderVersion: 16,
              pngContentSha256: "deadbeef",
              ownerRoutineProduction: "NONE",
              canvaRequired: false,
              makeRequired: false,
            },
          ],
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      },
    };
    expect(isProductionFrozen(frozen, "v2-rtu-flyer")).toBe(true);
    expect(needsFlyerProductionObserverRetry(frozen)).toBe(false);
  });

  it("Machine assigns a multi-service campaign across Design, Copy, and Video", async () => {
    const campaignId = `camp-workforce-millwright-multi-${Date.now()}`;
    const tmp = mkdtempSync(path.join(os.tmpdir(), "pt-multi-"));
    const skuIds = ["v2-rtu-menu", "v2-rtu-email-kit", "v2-rtu-short-video"] as const;
    const campaign = millwrightCampaign(campaignId, skuIds);
    const records = skuIds.map((skuId) => readyRecord(campaignId, skuId));
    const copy = await invokeCopyDispatchHook({
      repoRoot: tmp,
      campaign,
      dispatchRecord: records[1]!,
    });
    expect(copy.ok).toBe(true);
    const video = await invokeShortVideoDispatchHook({
      repoRoot: tmp,
      campaign,
      dispatchRecord: records[2]!,
      materials: [],
    });
    expect(video.ok).toBe(false);
    if (video.ok) return;
    expect(video.failureCode).toBe("MISSING_USABLE_FOOTAGE");

    recordMachineProductionPass({
      repoRoot: tmp,
      campaign,
      records,
      designResults: [],
      launchResults: [
        {
          dispatchId: records[1]!.dispatchId,
          skuId: "v2-rtu-email-kit",
          action: "invoked",
          ok: true,
          invocationOutcome: "PRODUCED",
          artifactRelativePath: copy.ok ? copy.artifactRelativePath : undefined,
          ownerRoutineProduction: "NONE",
        },
        {
          dispatchId: records[2]!.dispatchId,
          skuId: "v2-rtu-short-video",
          action: "invoked",
          ok: false,
          failureCode: "MISSING_USABLE_FOOTAGE",
          message: "Missing required footage.",
          ownerRoutineProduction: "NONE",
        },
      ],
    });
    const stored = readProductionTeamLog(tmp, campaignId);
    expect(stored.packets.map((row) => row.skuId).sort()).toEqual(
      [...skuIds].sort(),
    );
    expect(stored.packets.every((row) => row.capability)).toBe(true);
    expect(stored.reports.some((row) => row.from === "MACHINE" && row.to === "COPY_PRODUCTION")).toBe(
      true,
    );
    expect(stored.reports.some((row) => row.from === "MACHINE" && row.to === "VIDEO_PRODUCTION")).toBe(
      true,
    );
    expect(stored.reports.some((row) => row.from === "MACHINE" && row.to === "DESIGN_PRODUCTION")).toBe(
      false,
    );
    expect(stored.reports.some((row) => row.kind === "qa_result")).toBe(true);
  });

  it("skipped observer results are not logged as produced or QA passed", () => {
    const campaignId = `camp-workforce-held-${Date.now()}`;
    const tmp = mkdtempSync(path.join(os.tmpdir(), "pt-held-"));
    const skuIds = ["v2-rtu-menu", "v2-rtu-email-kit"] as const;
    const campaign = millwrightCampaign(campaignId, skuIds);
    const records = skuIds.map((skuId) => readyRecord(campaignId, skuId));

    recordMachineProductionPass({
      repoRoot: tmp,
      campaign,
      records,
      designResults: [
        {
          dispatchId: records[0]!.dispatchId,
          skuId: "v2-rtu-menu",
          action: "skipped",
          skipReason: "social_promo_composite_render_held",
          ok: true,
          ownerRoutineProduction: "NONE",
          canvaRequired: false,
          makeRequired: false,
        },
      ],
      launchResults: [
        {
          dispatchId: records[1]!.dispatchId,
          skuId: "v2-rtu-email-kit",
          action: "skipped",
          skipReason: "held",
          ok: true,
          ownerRoutineProduction: "NONE",
        },
      ],
    });
    const stored = readProductionTeamLog(tmp, campaignId);
    expect(stored.packets).toHaveLength(2);
    expect(stored.reports).toEqual([]);
  });

  it("Scout absence: Machine invoked Copy; this test did not author customer copy bytes", async () => {
    const campaignId = `camp-workforce-scout-absence-${Date.now()}`;
    const campaign = millwrightCampaign(campaignId, ["v2-rtu-email-kit"]);
    const record = readyRecord(campaignId, "v2-rtu-email-kit");
    const produced = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(produced.ok).toBe(true);
    if (!produced.ok) return;
    expect(produced.packageId).toBe("STUDIO-OPERATING-COPY-DISPATCH-HOOK-1");
    expect(produced.ownerRoutineProduction).toBe("NONE");
  });

  it("applies the Maya Version 16 freeze when the campaign is present", async () => {
    const result = await freezeMayaFlyerToVersion16({ repoRoot: REPO });
    expect(result.ok).toBe(true);
    if (result.frozen) {
      expect(result.campaign?.productionFreeze?.renderVersion).toBe(16);
      expect(result.campaign?.productionFreeze?.workVersionId).toBe("flyer-v16");
      expect(result.campaign?.productionFreeze?.doNotRemint).toBe(true);
      expect(isProductionFrozen(result.campaign, "v2-rtu-flyer")).toBe(true);
    }
  });
});
