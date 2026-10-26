/**
 * STUDIO-OPERATING-LIVE-SHOTSTACK-CERTIFICATION-1
 * Machine → Video Production → Shotstack → artifact → QA → Review.
 * Scout is not the producer. Live credentials cannot be invented.
 */

import { execFileSync } from "child_process";
import { createHash } from "crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import { studioLiveShotstackCertificationV1 } from "@/config/studio-live-shotstack-certification-v1";
import { upsertCampaignRecord } from "@/lib/campaign-store/store";
import { readTasksEnvelope } from "@/lib/campaign-tasks/store";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import { resolveClientReviewView } from "@/lib/job-control/review-room-view";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import {
  buildServiceScopeSnapshot,
  computePlanPricingTotals,
} from "@/lib/plan-pricing";
import {
  ensureShortVideoMachineReviewBind,
  ensureShortVideoMachineReviewBindFromCampaign,
  readShortVideoHookReceipt,
} from "@/lib/studio-customer-life/machine-short-video-review-bind";
import {
  SYNTHETIC_PNG_1X1_BYTES,
  certifyCustomerMaterialUpload,
} from "@/lib/studio-customer-content-intake";
import { ensureDispatchExecution } from "@/lib/studio-dispatch/ensure";
import { runLaunchMenuProductionObserver } from "@/lib/studio-dispatch/launch-menu-production-observer";
import { invokeShortVideoDispatchHook } from "@/lib/studio-dispatch/short-video-dispatch-hook";
import {
  shotstackCredentialPresence,
  type ShotstackFetch,
} from "@/lib/studio-kitchen-production/video-integration";
import { evaluateJobDispatch } from "@/lib/studio-dispatch/evaluate";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

const REPO = path.resolve(__dirname, "../../..");

function applyDotenvLocal(): void {
  const abs = path.join(REPO, ".env.local");
  if (!existsSync(abs)) return;
  const text = readFileSync(abs, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

applyDotenvLocal();
const CAMPAIGNS_DIR = path.join(REPO, "data", "campaigns");
const TASKS_DIR = path.join(REPO, "data", "campaign-tasks");
const MATERIALS_DIR = path.join(REPO, "data", "campaign-materials");
const EVIDENCE_DIR = path.join(
  REPO,
  "docs",
  "launch",
  "studio-operating-live-shotstack-certification-1",
);
const SKU = studioLiveShotstackCertificationV1.skuId;
const LIVE_PRESENCE = shotstackCredentialPresence();
const LIVE_CONFIGURED =
  LIVE_PRESENCE.configured && LIVE_PRESENCE.shotstackEnv === "stage";

function readyRecord(campaignId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${SKU}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: SKU,
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: `fp-${SKU}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: SKU,
  });
}

function paidCampaign(campaignId: string): CampaignRecord {
  const now = new Date().toISOString();
  const totals = computePlanPricingTotals([SKU]);
  return {
    campaignId,
    campaignName: "Moss Thread Studio",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "Package F live Shotstack certification",
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
      checkoutSessionId: `cs_pkgf_${campaignId}`,
      paymentIntentId: `pi_pkgf_${campaignId}`,
      stripeEventId: `evt_pkgf_${campaignId}`,
      selectedServiceIds: [SKU],
      decisionId: `dec_${campaignId}`,
      factFingerprint: `fp_${campaignId}`,
      draftRevision: 1,
      confirmedAt: now,
    },
    revisionRoundsUsed: 0,
    revisionRoundsIncluded: 1,
    deliverablesDelivered: {},
    createdAt: now,
    updatedAt: now,
    approvedStudioPlan: {
      selectedServiceIds: [SKU],
      includedServiceIds: [SKU],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: totals.oneTimeSubtotalCents,
      monthlyTotalCents: 0,
      amountDueTodayCents: totals.amountDueTodayCents,
      lineItems: buildServiceScopeSnapshot([SKU]),
      approvedAt: now,
    },
    projectDetailsSubmittedAt: now,
    routeMapIntakeSubmittedAt: now,
    routeMapIntake: {
      submittedAt: now,
      answers: {
        [`${SKU}:videoPurpose`]: "Workshop open-studio walk-through",
        [`${SKU}:onScreenText`]:
          "Moss Thread open studio. Seats $35. Call (804) 555-0144.",
        [`${SKU}:format`]: "Vertical",
      },
    },
  };
}

function stageStill(campaignId: string, bytes: Buffer = SYNTHETIC_PNG_1X1_BYTES): string {
  const relativePath = `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`;
  const abs = path.join(REPO, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, bytes);
  return relativePath;
}

function stageLiveCustomerStill(campaignId: string): Buffer {
  const relativePath = `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`;
  const abs = path.join(REPO, relativePath);
  mkdirSync(path.dirname(abs), { recursive: true });
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=0x3a2f1c:s=1080x1920:d=0.1",
        "-frames:v",
        "1",
        abs,
      ],
      { stdio: "ignore" },
    );
  } catch {
    /* ffmpeg missing */
  }
  if (!existsSync(abs) || readFileSync(abs).byteLength < 8_000) {
    throw new Error(
      "LIVE_STILL_REQUIRED: could not write a legitimate customer still for live Shotstack ingest.",
    );
  }
  return readFileSync(abs);
}

async function seedStillMaterial(
  campaignId: string,
  stillBytes: Buffer = SYNTHETIC_PNG_1X1_BYTES,
): Promise<string> {
  const now = new Date().toISOString();
  const staged = stageStill(campaignId, stillBytes);
  const bytes = stillBytes;
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const certified = certifyCustomerMaterialUpload({
    category: "photo-video",
    bytes,
    fileName: "still-1.png",
    mimeType: "image/png",
    checksumSha256,
    rightsInput: {
      useAuthorizationBasis: "customer_owns",
      commercialUsePermitted: true,
      cropAdaptPermitted: true,
      recognizablePeoplePresent: false,
      thirdPartyMaterialPresent: false,
    },
    evaluatedAt: now,
  });
  if (!certified.ok) {
    throw new Error(`STILL_CERT_FAILED: ${certified.error}`);
  }
  await writeMaterialsEnvelope({
    campaignId,
    items: [
      {
        id: `photo-${campaignId}`,
        category: "photo-video",
        requirementLevel: "optional",
        reviewStatus: "approved_for_use",
        contentKind: "file-metadata",
        label: "Workshop still",
        reason: "Customer-provided still for captions-only short video",
        relatedServiceIds: [SKU as never],
        uploadStatus: "stored",
        fileName: "still-1.png",
        mimeType: "image/png",
        sizeBytes: bytes.byteLength,
        url: staged,
        submittedAt: now,
        useAuthorization: { basis: "customer_owns", attestedAt: now },
        contentCertification: certified.certification,
      },
    ],
    updatedAt: now,
    syncedAt: now,
    version: 1,
  });
  return staged;
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

function makeVerticalMp4(): { bytes: Buffer; generated: boolean } {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "pkgf-mp4-"));
  const dest = path.join(tmp, "cert.mp4");
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
        dest,
      ],
      { stdio: "ignore" },
    );
    if (existsSync(dest)) {
      return { bytes: readFileSync(dest), generated: true };
    }
  } catch {
    /* ffmpeg absent */
  }
  return { bytes: Buffer.alloc(2048, 1), generated: false };
}

function mockFetch(input: {
  mode:
    | "submit_fail"
    | "timeout"
    | "poll_fail"
    | "render_fail"
    | "download_fail"
    | "corrupt"
    | "ingest_fail"
    | "success";
  mp4Bytes?: Buffer;
  renderId?: string;
}): ShotstackFetch {
  const renderId = input.renderId ?? `mock-${input.mode}`;
  return async (request, init) => {
    const url = String(request);
    if (input.mode === "ingest_fail" && url.includes("/ingest/") && url.endsWith("/upload")) {
      return new Response(JSON.stringify({ message: "ingest denied" }), { status: 400 });
    }
    if (url.endsWith("/render") && init?.method === "POST") {
      if (input.mode === "submit_fail") {
        return new Response(JSON.stringify({ message: "bad edit" }), { status: 400 });
      }
      return new Response(
        JSON.stringify({ response: { id: renderId, status: "queued" } }),
        { status: 200 },
      );
    }
    if (url.includes(`/render/${renderId}`)) {
      if (input.mode === "poll_fail") {
        return new Response("poll down", { status: 503 });
      }
      if (input.mode === "timeout") {
        return new Response(
          JSON.stringify({ response: { status: "rendering" } }),
          { status: 200 },
        );
      }
      if (input.mode === "render_fail") {
        return new Response(
          JSON.stringify({
            response: { status: "failed", error: "encoder exploded" },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          response: {
            status: "done",
            url: "https://cdn.example.test/pkgf.mp4",
            completed: new Date().toISOString(),
            data: { credits: 0.21 },
          },
        }),
        { status: 200 },
      );
    }
    if (url.includes("pkgf.mp4")) {
      if (input.mode === "download_fail") {
        return new Response("nope", { status: 500 });
      }
      if (input.mode === "corrupt") {
        return new Response(Buffer.alloc(2048, 7), {
          status: 200,
          headers: { "content-type": "video/mp4" },
        });
      }
      return new Response(input.mp4Bytes ?? Buffer.alloc(2048, 1), {
        status: 200,
        headers: { "content-type": "video/mp4" },
      });
    }
    return new Response("no", { status: 404 });
  };
}

function stillOverride(campaignId: string): Map<string, string> {
  return new Map([
    [
      `data/campaign-design-artifacts/${campaignId}/materials/still-1.png`,
      "https://example.test/still-1.png",
    ],
  ]);
}

async function runHookFailure(
  campaignId: string,
  mode: Parameters<typeof mockFetch>[0]["mode"],
  extras?: { mp4Bytes?: Buffer; skipOverride?: boolean },
) {
  const campaign = paidCampaign(campaignId);
  await seedStillMaterial(campaignId);
  return invokeShortVideoDispatchHook({
    repoRoot: REPO,
    campaign,
    dispatchRecord: readyRecord(campaignId),
    fetchImpl: mockFetch({ mode, mp4Bytes: extras?.mp4Bytes, renderId: `mock-${mode}` }),
    apiKey: "test-key-not-secret",
    assetUrlsOverride: extras?.skipOverride ? undefined : stillOverride(campaignId),
    pollMaxAttempts: 1,
    pollDelayMs: 1,
    sleepFn: async () => undefined,
  });
}

describe("STUDIO-OPERATING-LIVE-SHOTSTACK-CERTIFICATION-1", () => {
  const ids: string[] = [];
  afterEach(async () => {
    await Promise.all(ids.splice(0).map((id) => cleanup(id)));
  });

  it("verifies Shotstack Stage credential presence without exposing the secret", () => {
    expect(LIVE_PRESENCE.shotstackEnv).toBe("stage");
    expect(LIVE_PRESENCE.configured).toBe(true);
    expect(LIVE_PRESENCE.apiKeyPresent).toBe(true);
    expect(LIVE_PRESENCE.envVarName).toBe("SHOTSTACK_API_KEY");
    expect(Boolean(process.env.SHOTSTACK_PRODUCTION_API_KEY?.trim())).toBe(
      false,
    );
  });

  it("keeps Package F guards", () => {
    expect(studioLiveShotstackCertificationV1.packageId).toBe(
      "STUDIO-OPERATING-LIVE-SHOTSTACK-CERTIFICATION-1",
    );
    expect(studioLiveShotstackCertificationV1.doNotMerge).toBe(true);
    expect(studioLiveShotstackCertificationV1.doNotPush).toBe(true);
    expect(studioLiveShotstackCertificationV1.doNotTouchMaya).toBe(true);
    expect(studioLiveShotstackCertificationV1.doNotStartVoice).toBe(true);
    expect(studioLiveShotstackCertificationV1.captionsOnlyUnlessNarrationRequired).toBe(
      true,
    );
    expect(studioLiveShotstackCertificationV1.mockedProviderCannotEarnA).toBe(true);
    expect(studioLiveShotstackCertificationV1.skuId).toBe("v2-rtu-short-video");
  });

  it("paid Machine without stills fails closed MISSING_USABLE_FOOTAGE and does not open Review", async () => {
    const campaignId = `pkgf-nofootage-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);
    const hooked = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: readyRecord(campaignId),
      materials: [],
    });
    expect(hooked.ok).toBe(false);
    if (!hooked.ok) {
      expect(hooked.failureCode).toBe("MISSING_USABLE_FOOTAGE");
    }
    const first = await ensureDispatchExecution(campaign);
    expect(first.ok).toBe(true);
    const video = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
      (result) => result.skuId === SKU,
    );
    if (video) {
      expect(video.ok).toBe(false);
      expect(video.failureCode).toBe("MISSING_USABLE_FOOTAGE");
    }
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
    expect(job).toBeTruthy();
    expect(canClientAccessJobReview(job!)).toBe(false);
    expect(first.campaign.revisionRoundsUsed ?? 0).toBe(0);
    expect(first.campaign.campaignStatus).not.toBe("READY_FOR_REVIEW");
  });

  it.skipIf(LIVE_CONFIGURED)(
    "paid Machine with stills fails closed CREDENTIALS_BLOCKED when live Shotstack keys are absent",
    async () => {
      const campaignId = `pkgf-nokey-${Date.now()}`;
      ids.push(campaignId);
      const campaign = paidCampaign(campaignId);
      await upsertCampaignRecord(campaign);
      await seedStillMaterial(campaignId);
      const first = await ensureDispatchExecution(campaign);
      expect(first.ok).toBe(true);
      const video = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      expect(video?.ok).toBe(false);
      expect(video?.failureCode).toBe("CREDENTIALS_BLOCKED");
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      expect(canClientAccessJobReview(job!)).toBe(false);
      expect(first.campaign.campaignStatus).not.toBe("READY_FOR_REVIEW");
      mkdirSync(EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        path.join(EVIDENCE_DIR, "PACKAGE-F-EVIDENCE.json"),
        `${JSON.stringify(
          {
            packageId: studioLiveShotstackCertificationV1.packageId,
            skuId: SKU,
            liveCredentialsPresent: false,
            liveShotstackSubmitOccurred: false,
            machinePath:
              "ensureDispatchExecution → launch-menu observer → invokeShortVideoDispatchHook → runShotstackWorkPacketPipeline",
            liveResult: {
              failureCode: video?.failureCode,
              reviewOpen: false,
              scoutDidNotUploadMp4: true,
            },
            secretsRedacted: true,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
    },
  );

  it.skipIf(!LIVE_CONFIGURED)(
    "paid Machine live Shotstack Stage produces a Review-visible MP4 without Scout uploading it",
    async () => {
      const campaignId = `pkgf-live-${Date.now()}`;
      const campaign = paidCampaign(campaignId);
      await upsertCampaignRecord(campaign);
      const stillBytes = stageLiveCustomerStill(campaignId);
      await seedStillMaterial(campaignId, stillBytes);

      const first = await ensureDispatchExecution(campaign);
      const video = first.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
        (result) => result.skuId === SKU,
      );
      const dispatchId =
        video?.dispatchId ??
        first.campaign.dispatchExecution?.records.find((record) => record.skuId === SKU)
          ?.dispatchId ??
        "";
      const receipt = dispatchId
        ? readShortVideoHookReceipt({ campaignId, dispatchId })
        : null;

      if (!first.ok || video?.ok !== true) {
        mkdirSync(EVIDENCE_DIR, { recursive: true });
        writeFileSync(
          path.join(EVIDENCE_DIR, "PACKAGE-F-EVIDENCE.json"),
          `${JSON.stringify(
            {
              packageId: studioLiveShotstackCertificationV1.packageId,
              skuId: SKU,
              customer: campaign.campaignName,
              campaignId,
              liveCredentialsPresent: true,
              shotstackEnv: LIVE_PRESENCE.shotstackEnv,
              liveShotstackSubmitOccurred: Boolean(video?.providerRenderId),
              liveResult: {
                machineOk: first.ok,
                observerOk: video?.ok ?? false,
                failureCode: video?.failureCode ?? first.error ?? "LIVE_FAILED",
                message: video?.message ?? first.message ?? null,
                reviewOpen: false,
                scoutDidNotUploadMp4: true,
                providerRenderId: video?.providerRenderId ?? receipt?.providerRenderId ?? null,
                mp4ContentSha256: video?.mp4ContentSha256 ?? receipt?.mp4ContentSha256 ?? null,
              },
              secretsRedacted: true,
            },
            null,
            2,
          )}\n`,
          "utf8",
        );
        const tasks = await readTasksEnvelope(campaignId);
        const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
        if (job) expect(canClientAccessJobReview(job)).toBe(false);
        expect(
          video?.ok,
          video?.message ?? video?.failureCode ?? first.message ?? "live Machine failed",
        ).toBe(true);
        return;
      }

      const second = await ensureDispatchExecution(first.campaign);
      const secondVideo =
        second.campaign.dispatchExecution?.launchMenuProductionObserver?.results.find(
          (result) => result.skuId === SKU,
        );
      const tasks = await readTasksEnvelope(campaignId);
      const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
      const reviewOpen = job ? canClientAccessJobReview(job) : false;
      const view = job
        ? resolveClientReviewView({
            campaign: second.campaign,
            job,
            envelope: tasks!,
          })
        : null;
      const proof = view?.deliverables.flatMap((entry) => entry.proofFiles) ?? [];
      mkdirSync(EVIDENCE_DIR, { recursive: true });
      writeFileSync(
        path.join(EVIDENCE_DIR, "PACKAGE-F-EVIDENCE.json"),
        `${JSON.stringify(
          {
            packageId: studioLiveShotstackCertificationV1.packageId,
            skuId: SKU,
            customer: campaign.campaignName,
            campaignId,
            liveCredentialsPresent: true,
            shotstackEnv: LIVE_PRESENCE.shotstackEnv,
            liveShotstackSubmitOccurred: true,
            providerRenderId:
              video.providerRenderId ?? receipt?.providerRenderId ?? null,
            mp4ContentSha256: video.mp4ContentSha256 ?? receipt?.mp4ContentSha256 ?? null,
            mp4RelativePath: video.mp4RelativePath ?? receipt?.mp4RelativePath ?? null,
            durationSeconds: receipt?.durationSeconds ?? null,
            credits: receipt?.credits ?? null,
            firstInvocationOutcome: video.invocationOutcome ?? null,
            secondInvocationOutcome: secondVideo?.invocationOutcome ?? null,
            sameProviderRenderId:
              Boolean(video.providerRenderId) &&
              secondVideo?.providerRenderId === video.providerRenderId,
            reviewOpen,
            proofIsMp4: proof.some((file) => file.fileType === "video/mp4"),
            proofHasAccessHref: proof.some((file) => Boolean(file.accessHref)),
            revisionRoundsUsed: second.campaign.revisionRoundsUsed ?? 0,
            scoutDidNotUploadMp4: true,
            secretsRedacted: true,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      expect(canClientAccessJobReview(job!)).toBe(true);
      expect(second.campaign.revisionRoundsUsed ?? 0).toBe(0);
      expect(secondVideo?.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(secondVideo?.providerRenderId).toBe(video.providerRenderId);
      expect(proof.some((file) => file.fileType === "video/mp4")).toBe(true);
      expect(proof.some((file) => Boolean(file.accessHref))).toBe(true);
    },
    480_000,
  );

  it("provider failure contracts stay fail-closed and never mark Review ready", async () => {
    const cases: Array<{
      mode: Parameters<typeof mockFetch>[0]["mode"];
      code: string;
      skipOverride?: boolean;
    }> = [
      { mode: "submit_fail", code: "SUBMIT_FAILED" },
      { mode: "timeout", code: "RENDER_TIMEOUT" },
      { mode: "poll_fail", code: "POLL_FAILED" },
      { mode: "render_fail", code: "RENDER_FAILED" },
      { mode: "download_fail", code: "DOWNLOAD_FAILED" },
      { mode: "corrupt", code: "BIND_FAILED" },
      { mode: "ingest_fail", code: "INGEST_FAILED", skipOverride: true },
    ];
    for (const item of cases) {
      const campaignId = `pkgf-${item.mode}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
      ids.push(campaignId);
      const result = await runHookFailure(campaignId, item.mode, {
        skipOverride: item.skipOverride,
      });
      expect(result.ok, `${item.mode}: ${result.ok ? "ok" : result.failureCode}`).toBe(
        false,
      );
      if (result.ok) continue;
      expect(result.failureCode, item.mode).toBe(item.code);
    }
  });

  it("QA failure after a successful render does not open Review", async () => {
    const mp4 = makeVerticalMp4();
    if (!mp4.generated) {
      expect(mp4.generated).toBe(false);
      return;
    }
    const campaignId = `pkgf-qafail-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);
    await seedStillMaterial(campaignId);
    const dispatched = await ensureDispatchExecution(campaign);
    expect(dispatched.ok).toBe(true);
    const hooked = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign: dispatched.campaign,
      dispatchRecord:
        dispatched.campaign.dispatchExecution?.records.find((record) => record.skuId === SKU) ??
        readyRecord(campaignId),
      fetchImpl: mockFetch({ mode: "success", mp4Bytes: mp4.bytes, renderId: "mock-qa" }),
      apiKey: "test-key-not-secret",
      assetUrlsOverride: stillOverride(campaignId),
      pollMaxAttempts: 2,
      pollDelayMs: 1,
      sleepFn: async () => undefined,
    });
    expect(hooked.ok, hooked.ok ? "ok" : hooked.failureCode).toBe(true);
    if (!hooked.ok) return;
    await ensureShortVideoMachineReviewBind({
      campaignId,
      mp4Path: hooked.mp4RelativePath,
      contentSha256: hooked.mp4ContentSha256,
      durationSeconds: hooked.durationSeconds,
      videoQualityEvidence: {
        ...hooked.evidence,
        gatePassed: false,
        evaluation: {
          ...hooked.evidence.evaluation,
          ok: false,
          deterministicFailCount: 1,
          summary: "Creative/content checks failed after render.",
        },
      },
    });
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
    expect(canClientAccessJobReview(job!)).toBe(false);
  }, 30_000);

  it("mocked adapter success binds Review from Machine receipt without Scout uploading the MP4", async () => {
    const mp4 = makeVerticalMp4();
    if (!mp4.generated) {
      expect(mp4.generated).toBe(false);
      return;
    }
    const campaignId = `pkgf-bind-${Date.now()}`;
    ids.push(campaignId);
    const campaign = paidCampaign(campaignId);
    await upsertCampaignRecord(campaign);
    await seedStillMaterial(campaignId);
    const dispatched = await ensureDispatchExecution(campaign);
    expect(dispatched.ok).toBe(true);
    const dispatch = dispatched.campaign.dispatchExecution;
    expect(dispatch).toBeTruthy();
    const observed = await runLaunchMenuProductionObserver({
      campaign: dispatched.campaign,
      dispatch: dispatch!,
      fetchImpl: mockFetch({
        mode: "success",
        mp4Bytes: mp4.bytes,
        renderId: "mock-bind",
      }),
      videoApiKey: "test-key-not-secret",
      videoAssetUrlsOverride: stillOverride(campaignId),
    });
    const video = observed.results.find((result) => result.skuId === SKU);
    expect(video?.ok, video?.message ?? video?.failureCode).toBe(true);
    const withObserver: CampaignRecord = {
      ...dispatched.campaign,
      dispatchExecution: {
        ...dispatch!,
        launchMenuProductionObserver: observed,
      },
    };
    await upsertCampaignRecord(withObserver);
    const bound = await ensureShortVideoMachineReviewBindFromCampaign(withObserver);
    const again = await ensureShortVideoMachineReviewBindFromCampaign(bound);
    const tasks = await readTasksEnvelope(campaignId);
    const job = tasks?.jobRecords?.find((entry) => entry.skuId === SKU);
    expect(canClientAccessJobReview(job!)).toBe(true);
    expect(again.revisionRoundsUsed ?? 0).toBe(0);
    const view = resolveClientReviewView({
      campaign: again,
      job: job!,
      envelope: tasks!,
    });
    const proofs = view?.deliverables.flatMap((entry) => entry.proofFiles) ?? [];
    expect(proofs.some((file) => file.fileType === "video/mp4")).toBe(true);
    expect(proofs.some((file) => Boolean(file.accessHref))).toBe(true);
    const proofCount = (job?.fileRegistry ?? []).filter(
      (ref) => ref.category === "review_proof",
    ).length;
    expect(proofCount).toBe(1);
    const secondHook = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign: dispatched.campaign,
      dispatchRecord:
        dispatch?.records.find((record) => record.skuId === SKU) ??
        readyRecord(campaignId),
      fetchImpl: mockFetch({
        mode: "success",
        mp4Bytes: mp4.bytes,
        renderId: "mock-bind-duplicate",
      }),
      apiKey: "test-key-not-secret",
      assetUrlsOverride: stillOverride(campaignId),
      pollMaxAttempts: 1,
      pollDelayMs: 1,
      sleepFn: async () => undefined,
    });
    expect(secondHook.ok).toBe(true);
    if (secondHook.ok) {
      expect(secondHook.invocationOutcome).toBe("ALREADY_RENDERED");
      expect(secondHook.mp4ContentSha256).toBe(video?.mp4ContentSha256);
    }
  }, 30_000);
});
