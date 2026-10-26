import { createHash } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getServiceById } from "@/catalog/accessors";
import { getRouteMapIntakeSchema } from "@/catalog/intake";
import type { CampaignRecord } from "@/config/studio-board";
import { CLIP_REPURPOSING_SKU } from "@/config/studio-clip-repurposing-build-v1";
import {
  allowClipRepurposingStagingCheckout,
  CLIP_REPURPOSING_INTAKE_TEMPLATE,
  CLIP_REPURPOSING_PRIMARY_TOOL_ID,
  studioClipRepurposingLaunchIntegrationV1,
} from "@/config/studio-clip-repurposing-launch-integration-v1";
import {
  isOriginalFrozenNineSellNowSku,
  studioInternalSellNowRegisterV1,
} from "@/config/studio-internal-sell-now-register-v1";
import { SHORT_FORM_VIDEO_EDITING_SKU } from "@/config/studio-short-form-video-editing-build-v1";
import { writeMaterialsEnvelope } from "@/lib/materials/store";
import { buildProjectIntakePlan } from "@/lib/project-intake-plan";
import {
  fixtureStrongSource,
  fixtureTwoClipSource,
  fixtureWeakSource,
} from "@/lib/studio-clip-repurposing/fixtures";
import { resolveClipRepurposingCustomerOutcome } from "@/lib/studio-clip-repurposing/customer-outcome";
import { discoverClipSet } from "@/lib/studio-clip-repurposing/set-discovery";
import type { SetCandidate } from "@/lib/studio-clip-repurposing/types";
import {
  buildClipRepurposingStagingCampaign,
  getClipRepurposingStagingOffer,
} from "@/lib/studio-clip-repurposing-launch/staging-purchase";
import { ACTIVE_CUSTOMER_FACING_SKUS } from "@/lib/studio-kitchen-production/active-set";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production/resolve-contract";
import { assembleApprovedClientDelivery } from "@/lib/studio-review-revision/assemble-approved-delivery";
import { presentClipRepurposingReviewProof } from "@/lib/studio-review-revision/present-clip-repurposing-review";
import { reproduceClipRepurposingAfterRevision } from "@/lib/studio-review-revision/reproduce-clip-repurposing-after-revision";
import { writeCleanTalkingHeadFixture } from "@/lib/studio-source-audio-preflight/fixtures";
import { evaluateSourceAudioCheckoutGate } from "@/lib/studio-source-audio-preflight/checkout-gate";
import type { PurchasedJobRecord } from "@/lib/job-control/types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

import { invokeClipRepurposingDispatchHook } from "./clip-repurposing-dispatch-hook";
import { invokeFootageEditingDispatchHook } from "./footage-editing-dispatch-hook";
import { invokeShortVideoDispatchHook } from "./short-video-dispatch-hook";
import { runLaunchMenuProductionObserver } from "./launch-menu-production-observer";
import { mapClipRepurposingJobTruthFromJob } from "./map-clip-repurposing-job-truth";
import { evaluateJobDispatch } from "./evaluate";
import type { JobDispatchRecord } from "./types";

const REPO = path.resolve(__dirname, "../../..");
const SKU = CLIP_REPURPOSING_SKU;

function readyRecord(campaignId: string, skuId: string): JobDispatchRecord {
  const jobId = `${campaignId}::${skuId}`;
  return evaluateJobDispatch({
    campaignId,
    routing: {
      decisionId: `rd:${jobId}`,
      jobId,
      campaignId,
      skuId: skuId as JobDispatchRecord["skuId"],
      status: "READY_FOR_DISPATCH",
      readyForDispatch: true,
      productionFamilyId: "video_audio",
      controlLane: "standard",
      factFingerprint: `fp-${skuId}`,
      capabilityReadiness: "contract_ready",
      evaluatedAt: new Date().toISOString(),
      reason: null,
      blocker: null,
      ownerActionRequired: false,
    },
    jobId,
    skuId: skuId as JobDispatchRecord["skuId"],
  });
}

function campaignFor(campaignId: string): CampaignRecord {
  return buildClipRepurposingStagingCampaign({ campaignId });
}

function clearedTalkingHead(campaignId: string, fileName = "workshop-talking-head.mp4") {
  const rel = `data/campaign-design-artifacts/${campaignId}/materials/${fileName}`;
  const abs = path.join(REPO, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeCleanTalkingHeadFixture(abs);
  return {
    rel,
    item: {
      id: "source-1",
      category: "photo-video" as const,
      requirementLevel: "required" as const,
      reviewStatus: "approved_for_use" as const,
      contentKind: "file-metadata" as const,
      label: "Talking-head",
      reason: "Customer-cleared native-vertical source",
      relatedServiceIds: [SKU] as const,
      uploadStatus: "stored" as const,
      fileName,
      url: rel,
      useAuthorization: {
        basis: "customer_owns" as const,
        attestedAt: new Date().toISOString(),
      },
    },
  };
}

function fakeFiles(campaignId: string, selected: readonly SetCandidate[]) {
  return selected.map((candidate, index) => {
    const rel = `data/campaign-design-artifacts/${campaignId}/clip-${index + 1}.mp4`;
    const abs = path.join(REPO, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    const bytes = Buffer.from(`clip-${candidate.id}-${index + 1}`);
    writeFileSync(abs, bytes);
    return {
      clipId: candidate.id,
      idea: candidate.idea,
      relativePath: rel,
      contentSha256: createHash("sha256").update(bytes).digest("hex"),
      width: 1080 as const,
      height: 1920 as const,
    };
  });
}

describe("Clip Repurposing unpublished staging customer journey", () => {
  it("keeps the $549 offer on its dedicated contract and locks Kitchen 22", () => {
    expect(studioClipRepurposingLaunchIntegrationV1.priceCents).toBe(54900);
    expect(studioClipRepurposingLaunchIntegrationV1.primaryToolId).toBe(
      CLIP_REPURPOSING_PRIMARY_TOOL_ID,
    );
    expect(ACTIVE_CUSTOMER_FACING_SKUS).not.toContain(SKU);
    expect(ACTIVE_CUSTOMER_FACING_SKUS).toHaveLength(22);
    expect(isOriginalFrozenNineSellNowSku(SKU)).toBe(false);
    expect(studioInternalSellNowRegisterV1.internalSellNowCount).toBe(11);
    expect(allowClipRepurposingStagingCheckout(SKU)).toBe(true);
  });

  it("exposes a truthful unpublished catalog entry and 15–60 minute intake", () => {
    const service = getServiceById(SKU);
    expect(service?.priceCents).toBe(54900);
    expect(service?.intakeTemplate).toBe(CLIP_REPURPOSING_INTAKE_TEMPLATE);
    expect(service?.purpose).toMatch(/15–60 minute native-vertical English talking-head/);
    expect(service?.purpose).not.toMatch(/still photos/);
    const schema = getRouteMapIntakeSchema(CLIP_REPURPOSING_INTAKE_TEMPLATE);
    expect(schema.type).toBe("rtu-clip-repurposing");
    expect(schema.type).not.toBe("rtu-short-form-video-edit");
    expect(schema.type).not.toBe("rtu-short-video");
    expect(schema.lead).toMatch(/15–60 minute/);
    expect(schema.fields.some((field) => field.id === "ctaText" && field.required)).toBe(
      true,
    );
    expect(
      schema.fields.some((field) => field.id === "rightsAcknowledgement" && field.required),
    ).toBe(true);
    const plan = buildProjectIntakePlan([SKU]);
    expect(plan.services).toHaveLength(1);
    expect(plan.services[0]?.fields.some((field) => field.id === "ctaText")).toBe(true);
  });

  it("resolves a dedicated clip-factory contract, not $349 or $149", () => {
    const contract = resolveServiceProductionContract(SKU);
    expect(contract.status).toBe("resolved");
    if (contract.status !== "resolved") return;
    expect(contract.contract.primaryTool.toolId).toBe(CLIP_REPURPOSING_PRIMARY_TOOL_ID);
    expect(contract.contract.primaryTool.toolId).not.toBe("footage_editing_pipeline");
    expect(contract.contract.primaryTool.toolId).not.toBe("shotstack");
    const footage = resolveServiceProductionContract(SHORT_FORM_VIDEO_EDITING_SKU);
    expect(footage.status).toBe("resolved");
    if (footage.status !== "resolved") return;
    expect(footage.contract.primaryTool.toolId).toBe("footage_editing_pipeline");
  });

  it("maps long-source intake + rights and fails closed without a cleared file", () => {
    const campaignId = "camp-clip-intake-truth";
    const campaign = campaignFor(campaignId);
    const missing = mapClipRepurposingJobTruthFromJob({
      repoRoot: REPO,
      campaign,
      materials: [],
    });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.code).toBe("MISSING_USABLE_SOURCE");

    const source = clearedTalkingHead(campaignId);
    const ok = mapClipRepurposingJobTruthFromJob({
      repoRoot: REPO,
      campaign,
      materials: [source.item],
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.intake.skuId).toBe(SKU);
    expect(ok.intake.ctaText).toBe("Book at riverandreed.example");
  });

  it("blocks checkout when source-audio acknowledgement is still required", async () => {
    const blocked = await evaluateSourceAudioCheckoutGate({
      repoRoot: REPO,
      selectedServiceIds: [SKU],
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toBe("source_audio_preflight_required");
  });

  it("builds a $549 staging offer with dedicated checkout", () => {
    const offer = getClipRepurposingStagingOffer();
    expect(offer.priceCents).toBe(54900);
    expect(offer.checkoutAllowed).toBe(true);
    const staged = buildClipRepurposingStagingCampaign({
      campaignId: "camp-clip-staging-offer",
    });
    expect(staged.paymentTruth?.selectedServiceIds).toEqual([SKU]);
    expect(staged.paymentTruth?.expectedAmountCents).toBe(54900);
  });

  it("dispatches on the dedicated Clip path and refuses $349 / $149 hooks", async () => {
    const campaignId = `camp-clip-dispatch-${Date.now()}`;
    const campaign = campaignFor(campaignId);
    const source = clearedTalkingHead(campaignId);
    const record = readyRecord(campaignId, SKU);
    expect(record.executionIdentityReady).toBe(true);
    expect(record.requirements?.primaryTool.toolId).toBe(CLIP_REPURPOSING_PRIMARY_TOOL_ID);

    const fixture = fixtureStrongSource();
    const hooked = await invokeClipRepurposingDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [source.item],
      sourceDurationSeconds: fixture.sourceDurationSeconds,
      sentences: fixture.sentences,
      produce: async ({ selected }) => fakeFiles(campaignId, selected),
    });
    expect(hooked.ok, hooked.ok ? "ok" : `${hooked.failureCode}: ${hooked.message}`).toBe(
      true,
    );
    if (!hooked.ok) return;
    expect(hooked.skuId).toBe(SKU);
    expect(hooked.outcome.settlementPriceCents).toBe(54900);
    expect(hooked.files).toHaveLength(3);

    const footageRefuse = await invokeFootageEditingDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [source.item],
    });
    expect(footageRefuse.ok).toBe(false);
    if (footageRefuse.ok) return;
    expect(footageRefuse.failureCode).toBe("SKU_NOT_SUPPORTED");

    const stillsRefuse = await invokeShortVideoDispatchHook({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
    });
    expect(stillsRefuse.ok).toBe(false);
    if (stillsRefuse.ok) return;
    expect(stillsRefuse.failureCode).toBe("SKU_NOT_SUPPORTED");
  });

  it("makes 0 / 1 / 2 / 3+ customer remedies real without Owner intervention", async () => {
    expect(resolveClipRepurposingCustomerOutcome(0).settlementPriceCents).toBe(0);
    expect(resolveClipRepurposingCustomerOutcome(1).settlementPriceCents).toBe(34900);
    expect(resolveClipRepurposingCustomerOutcome(2).settlementPriceCents).toBe(44900);
    expect(resolveClipRepurposingCustomerOutcome(3).settlementPriceCents).toBe(54900);

    const zero = discoverClipSet(fixtureWeakSource());
    expect(zero.ok).toBe(false);
    expect(resolveClipRepurposingCustomerOutcome(zero.viableCount).treatment).toBe(
      "cannot_complete_as_sold",
    );

    const two = discoverClipSet(fixtureTwoClipSource());
    expect(two.ok).toBe(false);
    expect(two.viableCount).toBe(2);
    expect(resolveClipRepurposingCustomerOutcome(two.viableCount).treatment).toBe(
      "two_clip_outcome_at_449",
    );

    const cases: Array<{
      label: string;
      source: ReturnType<typeof fixtureStrongSource>;
    }> = [
      { label: "0", source: fixtureWeakSource() },
      { label: "2", source: fixtureTwoClipSource() },
      { label: "3+", source: fixtureStrongSource() },
    ];

    for (const row of cases) {
      const campaignId = `camp-clip-remedy-${row.label}-${Date.now()}`;
      const campaign = campaignFor(campaignId);
      const source = clearedTalkingHead(campaignId);
      const record = readyRecord(campaignId, SKU);
      const hooked = await invokeClipRepurposingDispatchHook({
        repoRoot: REPO,
        campaign,
        dispatchRecord: record,
        materials: [source.item],
        sourceDurationSeconds: row.source.sourceDurationSeconds,
        sentences: row.source.sentences,
        produce: async ({ selected, outcome }) =>
          fakeFiles(campaignId, selected.slice(0, outcome.fileCount)),
      });
      expect(hooked.ok).toBe(true);
      if (!hooked.ok) return;
      expect(hooked.outcome.ownerRoutineIntervention).toBe("NONE");
      expect(hooked.files).toHaveLength(hooked.outcome.fileCount);
      if (hooked.outcome.fileCount < 3) {
        expect(hooked.outcome.settlementPriceCents).not.toBe(54900);
      }
    }

    const oneCampaignId = `camp-clip-remedy-1-${Date.now()}`;
    const oneCampaign = campaignFor(oneCampaignId);
    const oneSource = clearedTalkingHead(oneCampaignId);
    const oneRecord = readyRecord(oneCampaignId, SKU);
    const one = await invokeClipRepurposingDispatchHook({
      repoRoot: REPO,
      campaign: oneCampaign,
      dispatchRecord: oneRecord,
      materials: [oneSource.item],
      sourceDurationSeconds: 20 * 60,
      sentences: fixtureStrongSource().sentences,
      discover: () => ({
        ok: false,
        productionAllowed: false,
        viableCount: 1,
        selected: [
          {
            id: "only-one",
            idea: "One strong idea",
            corePoint: "one idea",
            hookText: "One strong idea",
            bodyText: "This is the only publishable short.",
            windowStart: 80,
            windowEnd: 98,
            sentenceIndexes: [1],
            standalone: true,
            shortFormScore: 8,
            setValueScore: 8,
            semanticScore: 8,
            hookWordBonus: 0,
            claim: "One strong idea",
            whyViewerCares: "It stands alone.",
            semanticReasons: ["standalone"],
            hasSpokenEntry: true,
            hasEnoughToLand: true,
          },
        ],
        alternates: [],
        rejected: [],
        findings: ["only_one_viable"],
        setQuestion:
          "If the customer posted these three clips separately, would each feel like a distinct piece worth publishing?",
        setQuestionPass: false,
      }),
      produce: async ({ selected }) => fakeFiles(oneCampaignId, selected),
    });
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    expect(one.outcome.treatment).toBe("convert_to_349_short_form_video_editing");
    expect(one.outcome.settlementPriceCents).toBe(34900);
    expect(one.files).toHaveLength(1);
    expect(one.outcome.ownerRoutineIntervention).toBe("NONE");
  });

  it("observer keeps Clip, $349, and $149 results independent", async () => {
    const campaignId = `camp-clip-independent-${Date.now()}`;
    const source = clearedTalkingHead(campaignId);
    await writeMaterialsEnvelope({
      campaignId,
      items: [source.item],
      updatedAt: new Date().toISOString(),
      version: 1,
      syncedAt: new Date().toISOString(),
    });
    const clipRecord = readyRecord(campaignId, SKU);
    const footageRecord = readyRecord(campaignId, SHORT_FORM_VIDEO_EDITING_SKU);
    const stillsRecord = readyRecord(campaignId, "v2-rtu-short-video");
    const fixture = fixtureStrongSource();
    const observed = await runLaunchMenuProductionObserver({
      repoRoot: REPO,
      campaign: campaignFor(campaignId),
      dispatch: {
        schemaVersion: 1,
        status: "EXECUTION_IDENTITY_READY",
        evaluatedAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        activationCheckoutSessionId: `cs_${campaignId}`,
        records: [clipRecord, footageRecord, stillsRecord],
        ownerActionRequired: false,
      },
      clipSourceDurationSeconds: fixture.sourceDurationSeconds,
      clipSentences: fixture.sentences,
      clipProduce: async ({ selected }) => fakeFiles(campaignId, selected),
    });
    const clip = observed.results.find((result) => result.skuId === SKU);
    const footage = observed.results.find(
      (result) => result.skuId === SHORT_FORM_VIDEO_EDITING_SKU,
    );
    const stills = observed.results.find((result) => result.skuId === "v2-rtu-short-video");
    expect(clip?.ok).toBe(true);
    expect(clip?.customerOutcome?.settlementPriceCents).toBe(54900);
    expect(clip?.clipFiles).toHaveLength(3);
    expect(footage?.ok).toBe(false);
    expect(stills?.ok).toBe(false);
  });

  it("presents the three-clip set as one Review and one set revision", async () => {
    const campaignId = `camp-clip-review-${Date.now()}`;
    const campaign = campaignFor(campaignId);
    const fixture = fixtureStrongSource();
    const discovered = discoverClipSet(fixture);
    expect(discovered.ok).toBe(true);
    if (!discovered.ok) return;
    const files = fakeFiles(campaignId, discovered.selected);
    const now = new Date().toISOString();
    const envelope = {
      campaignId,
      version: 12,
      planFingerprint: "fp-clip",
      updatedAt: now,
      syncedAt: now,
      tasks: [],
      jobRecords: [
        {
          jobId: `${campaignId}::${SKU}`,
          campaignId,
          skuId: SKU,
          serviceName: "Clip Repurposing",
          spineStatus: "ready_for_review",
          productionLane: "quick",
          intakeComplete: true,
          updatedAt: now,
        },
      ],
    } as unknown as ServerTasksEnvelope;
    const presented = await presentClipRepurposingReviewProof({
      campaign,
      envelope,
      files: files.map((file, index) => ({
        relativePath: file.relativePath,
        contentSha256: file.contentSha256,
        label: `Clip ${index + 1} — ${file.idea}`,
      })),
      renderVersion: 1,
    });
    expect(presented.presented).toBe(true);
    const proofs = presented.envelope.jobRecords?.[0]?.fileRegistry?.filter(
      (ref) => ref.category === "review_proof",
    );
    expect(proofs).toHaveLength(3);
    expect(presented.envelope.jobRecords?.[0]?.skuId).toBe(SKU);

    const source = clearedTalkingHead(`${campaignId}-rev`);
    const record = readyRecord(campaignId, SKU);
    const alternate = discovered.alternates[0];
    expect(alternate).toBeTruthy();
    let sawSetRevision = false;
    const revised = await reproduceClipRepurposingAfterRevision({
      repoRoot: REPO,
      campaign,
      dispatchRecord: record,
      materials: [source.item],
      sourceDurationSeconds: fixture.sourceDurationSeconds,
      sentences: fixture.sentences,
      setRevision: {
        kind: "swap_clip",
        removeId: discovered.selected[0]!.id,
        addId: alternate!.id,
      },
      produce: async ({ selected, applyRevision }) => {
        sawSetRevision = applyRevision === true;
        return fakeFiles(`${campaignId}-rev`, selected);
      },
    });
    expect(revised.ok).toBe(true);
    expect(sawSetRevision).toBe(true);
  });

  it("pins three labeled client-visible MP4s as Final Delivery", () => {
    const hashes = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
    const now = new Date().toISOString();
    const job = {
      jobId: "job-clip-delivery",
      campaignId: "camp-clip-delivery",
      skuId: SKU,
      serviceName: "Clip Repurposing",
      spineStatus: "approved_for_delivery",
      productionLane: "quick",
      intakeComplete: true,
      updatedAt: now,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        contentSha256s: hashes.map((hash) => `sha256:${hash}`),
        artifactIds: ["clip-set-v1"],
        decisionId: "dec-1",
        workVersionId: "wv-1",
      },
      fileRegistry: hashes.map((hash, index) => ({
        id: `ref-clip-${index + 1}`,
        filename: `clip-${index + 1}.mp4`,
        fileType: "video/mp4",
        category: "review_proof",
        visibility: "client_visible",
        status: "approved_for_review",
        versionLabel: "Set version 1",
        addedAt: now,
        deliverableKey: `clip-repurposing-${index + 1}`,
        deliverableLabel: `Clip ${index + 1} — 1080×1920 MP4`,
        storageRef: {
          provider: "supabase_storage",
          checksumSha256: hash,
          contentType: "video/mp4",
          objectPath: `clip/clip-${index + 1}.mp4`,
        },
      })),
    } as unknown as PurchasedJobRecord;
    const assembled = assembleApprovedClientDelivery({
      job,
      events: [],
      actor: {
        id: "studio-machine",
        email: "machine@studio.local",
        displayName: "Studio Machine",
        roles: ["staff"],
      },
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles).toHaveLength(3);
    expect(
      assembled.job.clientDeliveryFiles?.every((file) =>
        /1080×1920 MP4/.test(file.deliverableLabel),
      ),
    ).toBe(true);
  });

  it("replaces the swapped clip slot so Final Delivery stays three files", () => {
    const first = ["a".repeat(64), "b".repeat(64), "c".repeat(64)];
    const revisedThird = "d".repeat(64);
    const now = new Date().toISOString();
    const proofs = [
      ...first.map((hash, index) => ({
        id: `ref-clip-${index + 1}`,
        filename: `clip-${index + 1}-v1.mp4`,
        fileType: "video/mp4",
        category: "review_proof",
        visibility: "client_visible",
        status: "approved_for_review",
        versionLabel: "Set version 1",
        addedAt: now,
        deliverableKey: `clip-repurposing-${index + 1}`,
        deliverableLabel: `Clip ${index + 1} — first cut`,
        storageRef: {
          provider: "supabase_storage",
          checksumSha256: hash,
          contentType: "video/mp4",
          objectPath: `clip/clip-${index + 1}.mp4`,
        },
      })),
      {
        id: "ref-clip-3-v2",
        filename: "clip-3-v2.mp4",
        fileType: "video/mp4",
        category: "review_proof",
        visibility: "client_visible",
        status: "approved_for_review",
        versionLabel: "Set version 2",
        addedAt: now,
        deliverableKey: "clip-repurposing-3",
        deliverableLabel: "Clip 3 — set revision",
        storageRef: {
          provider: "supabase_storage",
          checksumSha256: revisedThird,
          contentType: "video/mp4",
          objectPath: "clip/clip-3-v2.mp4",
        },
      },
    ];
    const job = {
      jobId: "job-clip-revision-delivery",
      campaignId: "camp-clip-revision-delivery",
      skuId: SKU,
      serviceName: "Clip Repurposing",
      spineStatus: "approved_for_delivery",
      productionLane: "quick",
      intakeComplete: true,
      updatedAt: now,
      customerApprovedArtifactAuthorization: {
        status: "CUSTOMER_APPROVED",
        contentSha256s: [...first, revisedThird].map((hash) => `sha256:${hash}`),
        artifactIds: ["clip-set-v1"],
        decisionId: "dec-1",
        workVersionId: "wv-2",
      },
      fileRegistry: proofs,
    } as unknown as PurchasedJobRecord;
    const assembled = assembleApprovedClientDelivery({
      job,
      events: [],
      actor: {
        id: "studio-machine",
        email: "machine@studio.local",
        displayName: "Studio Machine",
        roles: ["staff"],
      },
    });
    expect(assembled.assembled).toBe(true);
    expect(assembled.job.clientDeliveryFiles).toHaveLength(3);
    const third = assembled.job.clientDeliveryFiles?.find(
      (file) => file.deliverableKey === "clip-repurposing-3",
    );
    expect(third?.contentSha256).toContain(revisedThird);
  });
});
