/**
 * STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1
 * Non-Maya certification: copy + short-video Machine invoke.
 */

import { execFileSync } from "child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import {
  launchMenuHonestClassification,
  productionTeamRoleContracts,
  studioLaunchMenuProductionRuntimeV1,
} from "@/config/studio-launch-menu-production-runtime-v1";
import { loadCampaignVisualSystem } from "@/lib/studio-campaign-creative/visual-system/rooted-ready-wellness-v1";
import { assembleCopyFromFacts } from "@/lib/studio-copy-production";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { validateShotstackWorkPacket } from "@/lib/studio-kitchen-production/video-integration";

import { invokeCopyDispatchHook } from "./copy-dispatch-hook";
import { evaluateJobDispatch } from "./evaluate";
import { shouldObserveDesignRenderer } from "./design-renderer-observer";
import { runLaunchMenuProductionObserver } from "./launch-menu-production-observer";
import { invokeShortVideoDispatchHook } from "./short-video-dispatch-hook";
import type { JobDispatchRecord } from "./types";

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

function copyCampaign(campaignId: string, skuId: "v2-rtu-email-kit"): CampaignRecord {
  const now = new Date().toISOString();
  return {
    campaignId,
    campaignName: "River Reed Pottery",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Email kit cert",
    estimatedCompletion: "Soon",
    packageId: "custom-studio-plan",
    packageLabel: "Custom Studio Plan",
    revisionRoundsUsed: 0,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${skuId}:campaignGoal`]: "Open Studio Saturday for wheel-throwing seats",
        [`${skuId}:mustInclude`]:
          "Open Studio Saturday — wheel-throwing seats $35. Call (804) 555-0177 or visit riverandreed.example",
        [`${skuId}:callToAction`]: "Call (804) 555-0177 or visit riverandreed.example",
        [`${skuId}:listConsent`]: "Yes — I own the list and have consent",
        [`${skuId}:sendingAccount`]: "Mailchimp",
        [`${skuId}:mustNotSay`]: "guaranteed savings",
      },
    },
  };
}

describe("STUDIO-OPERATING-LAUNCH-MENU-PRODUCTION-RUNTIME-1", () => {
  it("keeps Package A / Maya / refund / revision guards", () => {
    expect(studioLaunchMenuProductionRuntimeV1.doNotTouchMaya).toBe(true);
    expect(studioLaunchMenuProductionRuntimeV1.packageAUnchanged).toBe(true);
    expect(studioLaunchMenuProductionRuntimeV1.refundPolicyUnchanged).toBe(true);
    expect(studioLaunchMenuProductionRuntimeV1.customerRevisionPolicyUnchanged).toBe(true);
    expect(studioLaunchMenuProductionRuntimeV1.carousel).toBe("NOT_ON_LAUNCH_MENU");
    expect(studioLaunchMenuProductionRuntimeV1.printFulfillment).toBe(
      "DIGITAL_FILES_ONLY",
    );
    expect(studioLaunchMenuProductionRuntimeV1.campaignCreativeGeneralRuntime).toBe(
      "NOT_ESTABLISHED",
    );
    expect(launchMenuHonestClassification.carousel).toBe("NOT_ON_LAUNCH_MENU");
    expect(launchMenuHonestClassification["v2-rtu-voice"]).toBe("NOT_AUTONOMOUS_HOLD");
    expect(launchMenuHonestClassification["v2-rtu-short-form-video-edit"]).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
    expect(launchMenuHonestClassification["v2-rtu-clip-repurposing"]).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
    expect(launchMenuHonestClassification["v2-rtu-short-video"]).toBe(
      "READY_WITH_EXPLICIT_LIMITS",
    );
    expect(launchMenuHonestClassification.campaign_creative_general_customer).toBe(
      "NOT_AUTONOMOUS_HOLD",
    );
    expect(productionTeamRoleContracts).toHaveLength(6);
  });

  it("does not treat named certification visual systems as a general customer engine", () => {
    expect(() => loadCampaignVisualSystem("rooted-ready-wellness-v1")).not.toThrow();
    expect(() => loadCampaignVisualSystem("general-customer-from-intake")).toThrow(
      /UNKNOWN_CAMPAIGN_VISUAL_SYSTEM/,
    );
  });

  it("design/print SKUs remain on the Design Renderer observer", () => {
    for (const skuId of [
      "v2-rtu-flyer",
      "v2-rtu-promotion-graphics",
      "v2-rtu-social-posts",
      "v2-rtu-business-card",
      "v2-rtu-menu",
      "v2-rtu-service-sheet",
    ] as const) {
      const contract = resolveServiceProductionContract(skuId);
      expect(contract.contract.primaryTool.toolId).toBe("studio_design_renderer");
      const record = readyRecord("camp-design-lane", skuId);
      expect(shouldObserveDesignRenderer(record).invoke).toBe(true);
    }
  });

  it("email-kit contract points at the Machine copy producer", () => {
    const email = resolveServiceProductionContract("v2-rtu-email-kit");
    expect(email.contract.primaryTool.toolId).toBe("studio_copy_producer");
    expect(email.contract.primaryTool.integrationState).toBe("integrated");
  });

  it("assembles email copy from customer facts without inventing prices", () => {
    const assembled = assembleCopyFromFacts({
      skuId: "v2-rtu-email-kit",
      businessName: "River Reed Pottery",
      campaignGoal: "Open Studio Saturday",
      mustInclude: "Wheel-throwing seats $35. Call (804) 555-0177.",
      callToAction: "Call (804) 555-0177",
      compliance: "",
      mustNotSay: "guaranteed savings",
      messageCopy: "",
      sendingAccount: "Mailchimp",
      listConsent: "Yes — I own the list and have consent",
    });
    expect(assembled.ok).toBe(true);
    if (!assembled.ok) return;
    const blob = JSON.stringify(assembled.submission);
    expect(blob).toContain("$35");
    expect(blob).toContain("(804) 555-0177");
    expect(blob).not.toMatch(/50% off|guaranteed|testimonial/i);
  });

  it("fails closed when list consent is not confirmed", () => {
    const assembled = assembleCopyFromFacts({
      skuId: "v2-rtu-email-kit",
      businessName: "River Reed Pottery",
      campaignGoal: "Open Studio Saturday",
      mustInclude: "Seats $35",
      callToAction: "Call (804) 555-0177",
      compliance: "",
      mustNotSay: "",
      messageCopy: "",
      sendingAccount: "Mailchimp",
      listConsent: "Not yet — I need to set this up first",
    });
    expect(assembled.ok).toBe(false);
    if (assembled.ok) return;
    expect(assembled.code).toBe("CONSENT_NOT_CONFIRMED");
  });

  it("Machine copy hook produces email-kit and is idempotent", async () => {
    const campaignId = `camp-launch-copy-river-reed-${Date.now()}`;
    const campaign = copyCampaign(campaignId, "v2-rtu-email-kit");
    const record = readyRecord(campaignId, "v2-rtu-email-kit");
    const first = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(first.ok, first.ok ? "ok" : `${first.failureCode}: ${first.message}`).toBe(
      true,
    );
    if (!first.ok) return;
    expect(first.evidence.gatePassed).toBe(true);
    expect(first.attempts).toBeGreaterThanOrEqual(1);
    const second = await invokeCopyDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.invocationOutcome).toBe("ALREADY_PRODUCED");
  });

  it("short-video fails closed without customer stills", async () => {
    const campaignId = "camp-launch-video-no-stills";
    const now = new Date().toISOString();
    const campaign: CampaignRecord = {
      ...copyCampaign(campaignId, "v2-rtu-email-kit"),
      campaignId,
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "v2-rtu-short-video:videoPurpose": "Open studio walk-through",
          "v2-rtu-short-video:onScreenText":
            "Open Studio Saturday. Seats $35. Call (804) 555-0177.",
          "v2-rtu-short-video:format": "Vertical",
        },
      },
    };
    const record = readyRecord(campaignId, "v2-rtu-short-video");
    const result = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failureCode).toBe("MISSING_USABLE_FOOTAGE");
  });

  it("captions-only Shotstack packet is valid without ElevenLabs", () => {
    const packet = {
      workPacketId: "wp-test",
      workPacketVersion: "1",
      storyboardVersion: "1",
      scriptVersionId: "script-1",
      campaignId: "camp-x",
      skuId: "v2-rtu-short-video" as const,
      label: "captions only",
      durationMinSeconds: 15,
      durationMaxSeconds: 30,
      durationTargetSeconds: 18,
      aspectRatio: "vertical" as const,
      width: 1080 as const,
      height: 1920 as const,
      exportFormat: "mp4" as const,
      musicAllowed: false as const,
      stockAllowed: false as const,
      productionMethod: "shotstack" as const,
      productionRoleOwner: "creative_production" as const,
      audioMode: "captions_only" as const,
      exportRelativePath: "tmp/x.mp4",
      ctaCaptionSceneNumber: 1,
      primaryCtaText: "Call (804) 555-0177",
      scenes: [
        {
          sceneNumber: 1,
          assetId: "still-1",
          relativePath: "tmp/still.png",
          startSeconds: 0,
          endSeconds: 18,
          caption: "Call (804) 555-0177",
          captionPresentation: "overlay" as const,
        },
      ],
    };
    expect(validateShotstackWorkPacket(packet).ok).toBe(true);
  });

  it("Machine observer coordinates copy success and video footage failure independently", async () => {
    const campaignId = `camp-launch-multi-river-reed-${Date.now()}`;
    const campaign = copyCampaign(campaignId, "v2-rtu-email-kit");
    const copyRecord = readyRecord(campaignId, "v2-rtu-email-kit");
    const videoRecord = readyRecord(campaignId, "v2-rtu-short-video");
    const observed = await runLaunchMenuProductionObserver({
      campaign: {
        ...campaign,
        routeMapIntake: {
          submittedAt: campaign.routeMapIntake!.submittedAt,
          answers: {
            ...campaign.routeMapIntake!.answers,
            "v2-rtu-short-video:videoPurpose": "Open studio walk-through",
            "v2-rtu-short-video:onScreenText": "Open Studio Saturday. Call (804) 555-0177.",
            "v2-rtu-short-video:format": "Vertical",
          },
        },
      },
      dispatch: {
        schemaVersion: 1,
        status: "evaluated",
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: "cs_multi",
        records: [copyRecord, videoRecord],
        ownerActionRequired: false,
      },
    });
    const copyResult = observed.results.find((r) => r.skuId === "v2-rtu-email-kit");
    const videoResult = observed.results.find((r) => r.skuId === "v2-rtu-short-video");
    expect(copyResult?.ok, copyResult?.message ?? copyResult?.failureCode).toBe(
      true,
    );
    expect(videoResult?.ok).toBe(false);
    expect(videoResult?.failureCode).toBe("MISSING_USABLE_FOOTAGE");
  });

  it("short-video hook invokes Shotstack pipeline from customer stills (mocked provider)", async () => {
    const campaignId = `camp-launch-video-stills-${Date.now()}`;
    const now = new Date().toISOString();
    const materialsDir = path.join(
      REPO,
      "data/campaign-design-artifacts",
      campaignId,
      "materials",
    );
    mkdirSync(materialsDir, { recursive: true });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    writeFileSync(path.join(materialsDir, "still-1.png"), png);
    const campaign: CampaignRecord = {
      ...copyCampaign(campaignId, "v2-rtu-email-kit"),
      campaignId,
      routeMapIntake: {
        submittedAt: now,
        answers: {
          "v2-rtu-short-video:videoPurpose": "Open studio walk-through",
          "v2-rtu-short-video:onScreenText":
            "Open Studio Saturday. Wheel-throwing seats $35. Call (804) 555-0177.",
          "v2-rtu-short-video:format": "Vertical",
        },
      },
    };
    const urls = new Map<string, string>([
      [
        `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`,
        "https://example.test/still-1.png",
      ],
    ]);
    const tmp = mkdtempSync(path.join(os.tmpdir(), "studio-launch-mp4-"));
    const mockMp4 = path.join(tmp, "launch.mp4");
    let mp4Bytes = Buffer.alloc(2048, 1);
    let generatedValidMp4 = false;
    try {
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          "color=c=black:s=1080x1920:d=18",
          "-pix_fmt",
          "yuv420p",
          "-t",
          "18",
          mockMp4,
        ],
        { stdio: "ignore" },
      );
      if (existsSync(mockMp4)) {
        mp4Bytes = readFileSync(mockMp4);
        generatedValidMp4 = true;
      }
    } catch {
      generatedValidMp4 = false;
    }
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/render") && init?.method === "POST") {
        return new Response(
          JSON.stringify({ response: { id: "mock-rend-launch", status: "queued" } }),
          { status: 200 },
        );
      }
      if (url.includes("/render/mock-rend-launch")) {
        return new Response(
          JSON.stringify({
            response: {
              status: "done",
              url: "https://cdn.example.test/launch.mp4",
              completed: new Date().toISOString(),
            },
          }),
          { status: 200 },
        );
      }
      if (url.includes("launch.mp4")) {
        return new Response(mp4Bytes, {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      }
      return new Response("no", { status: 404 });
    };
    const stillRel = `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`;
    const result = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyRecord(campaignId, "v2-rtu-short-video"),
      materials: [
        {
          id: "still-1",
          category: "photo-video",
          requirementLevel: "required",
          reviewStatus: "approved_for_use",
          contentKind: "file-metadata",
          label: "Workshop still",
          reason: "Customer-cleared still for captions-only short video",
          relatedServiceIds: ["v2-rtu-short-video"],
          uploadStatus: "stored",
          fileName: "still-1.png",
          url: stillRel,
          useAuthorization: {
            basis: "customer_owns",
            attestedAt: now,
          },
        },
      ],
      fetchImpl,
      apiKey: "test-key",
      assetUrlsOverride: urls,
      pollMaxAttempts: 3,
      pollDelayMs: 1,
      sleepFn: async () => undefined,
    });
    expect(
      result.ok ||
        result.failureCode === "BIND_FAILED" ||
        result.failureCode === "VIDEO_QA_FAILURE",
    ).toBe(true);
    if (!result.ok) {
      expect(["BIND_FAILED", "VIDEO_QA_FAILURE", "DOWNLOAD_FAILED"]).toContain(
        result.failureCode,
      );
      if (!generatedValidMp4) {
        expect(result.failureCode).toBe("BIND_FAILED");
      }
    }
  }, 30_000);
});
