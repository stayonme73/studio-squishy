import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type {
  CampaignTaskItem,
  ProductionRole,
  ProductionTaskFamilyId,
  TaskPhase,
} from "@/lib/campaign-tasks/types";
import type { CampaignMaterialItem } from "@/lib/materials/types";

import { applyProductionWorkspacePatch } from "./production-workspace-actions";
import {
  allRequiredDeliverablesPrepared,
  canSubmitForOwnerApproval,
  canTransitionToBuildingConcepts,
  resolveRequiredDeliverableKeys,
} from "./production-workspace-gates";
import { resolveProductionLaneViews } from "./capacity";
import { buildJobId } from "./lane-map";
import type { PurchasedJobRecord } from "./types";
import type { ServerTasksEnvelope } from "@/lib/campaign-tasks/types";

function lineItem(skuId: string, name: string) {
  return {
    skuId,
    serviceId: skuId,
    serviceName: name,
    billingType: "one_time" as const,
    exactPriceCents: 10000,
    priceDisplay: "$100",
    deliverables: ["Concept set", "Final export"],
    exclusions: [],
    timingWindowLabel: "3–5 days",
    revisionRule: "1 round",
    clientResponsibilities: [],
    executionResponsibility: "Studio",
  };
}

function oneDeliverableLineItem(skuId: string, name: string, deliverable: string) {
  return {
    ...lineItem(skuId, name),
    deliverables: [deliverable],
  };
}

function campaign(overrides: Partial<CampaignRecord> = {}): CampaignRecord {
  return {
    campaignId: "camp-pw",
    campaignName: "PW Demo",
    campaignStatus: "BUILDING_CONCEPTS",
    campaignDescription: "",
    estimatedCompletion: "July 15, 2026",
    packageId: "custom-studio-plan",
    packageLabel: "Custom",
    paymentReceivedAt: "2026-07-01T10:00:00.000Z",
    projectDetailsSubmittedAt: "2026-07-01T12:00:00.000Z",
    approvedStudioPlan: {
      selectedServiceIds: ["sm-001"],
      includedServiceIds: ["sm-001"],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [lineItem("sm-001", "Social")],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
    createdAt: "2026-07-01T08:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  } as CampaignRecord;
}

function baseJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  const now = "2026-07-03T12:00:00.000Z";
  return {
    jobId: buildJobId("camp-pw", "sm-001"),
    campaignId: "camp-pw",
    skuId: "sm-001",
    serviceName: "Social",
    spineStatus: "ready_for_queue",
    productionLane: "quick",
    intakeComplete: true,
    laneQueuedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function acceptedJob(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return baseJob({
    acceptanceReview: {
      status: "accepted",
      reviewedAt: "2026-07-03T12:00:00.000Z",
      reviewedBy: { role: "staff", displayName: "Staff" },
      clientConfirmed: [],
      studioConfirmed: [],
      missingMaterials: [],
      risks: [],
      assumptions: [],
      routeTo: "production",
    },
    ...overrides,
  });
}

function envelope(job: PurchasedJobRecord): ServerTasksEnvelope {
  return {
    campaignId: "camp-pw",
    tasks: [],
    planFingerprint: "test",
    updatedAt: "2026-07-03T12:00:00.000Z",
    version: 10,
    syncedAt: "2026-07-03T12:00:00.000Z",
    jobRecords: [job],
    jobActivityEvents: [],
  };
}

/** Minimal internal QA pass so Review entry can open under QA-BEFORE-REVIEW-1. */
function withInternalQaPass(
  env: ServerTasksEnvelope,
  skuId: string = "sm-001",
  familyId: ProductionTaskFamilyId = "social",
): ServerTasksEnvelope {
  const taskId = `${skuId}:qa`;
  const catalogFamilyId =
    familyId === "video_audio"
      ? ("marketing_video" as const)
      : familyId === "marketing_assets"
        ? ("marketing_assets" as const)
        : ("social_media" as const);
  const qaTask: CampaignTaskItem = {
    id: taskId,
    title: `${skuId} QA`,
    phase: "qa",
    status: "ready",
    relatedServiceIds: [skuId as never],
    familyId,
    catalogFamilyId,
    serviceName: skuId,
    dependsOn: [],
    workflowState: "complete",
  };

  const baseRecord = {
    id: `qa-${skuId}`,
    taskId,
    campaignId: env.campaignId,
    createdAt: "2026-07-03T13:00:00.000Z",
    actorUserId: "qa-1",
    actorDisplayName: "QA",
    actorRole: "qa" as const,
    action: "qa_pass" as const,
    checks: ["quality"],
  };

  const designEvidence = {
    designQualityEvidence: {
      evaluation: {
        skuId,
        fixtureId: "fixture",
        ok: true,
        findings: [],
        checkedAt: "2026-07-03T13:00:00.000Z",
        deterministicFailCount: 0,
        judgmentRequired: true as const,
        summary: "ok",
      },
      attestations: {
        hierarchyReviewed: true,
        readabilityReviewed: true,
        spacingCompositionReviewed: true,
        brandFitReviewed: true,
        genericnessRejected: true,
        exportReadinessReviewed: true,
        notes: "ok",
      },
      gatePassed: true,
    },
    artifactBinding: {
      artifactIds: [`${skuId}-art`],
      contentSha256s: [`${skuId}-hash`],
    },
  };

  const record =
    skuId === "v2-rtu-short-video"
      ? {
          ...baseRecord,
          videoQualityEvidence: {
            evaluation: {
              skuId,
              ok: true,
              findings: [],
              checkedAt: "2026-07-03T13:00:00.000Z",
              deterministicFailCount: 0,
              judgmentRequired: true as const,
              assemblyCapability: "present_and_usable" as const,
              summary: "ok",
            },
            attestations: { timingReviewed: true } as never,
            gatePassed: true,
          },
          artifactBinding: {
            artifactIds: [`${skuId}-art`],
            contentSha256s: [`${skuId}-hash`],
          },
        }
      : skuId.startsWith("v2-rtu-") ||
          familyId === "marketing_assets" ||
          skuId === "sm-001" ||
          skuId === "sm-001-monthly" ||
          skuId === "bf-001" ||
          skuId === "rm-j007"
        ? { ...baseRecord, ...designEvidence }
        : baseRecord;

  const withoutDup = env.tasks.filter((entry) => entry.id !== taskId);
  return {
    ...env,
    tasks: [...withoutDup, qaTask],
    qaRecords: [...(env.qaRecords ?? []).filter((r) => r.taskId !== taskId), record],
  };
}

function taskForJob(input: {
  skuId: string;
  serviceName: string;
  phase: TaskPhase;
  familyId: ProductionTaskFamilyId;
  role: ProductionRole;
}): CampaignTaskItem {
  return {
    id: `${input.skuId}:${input.phase}`,
    title: `${input.serviceName} — ${input.role}`,
    phase: input.phase,
    status: "ready",
    relatedServiceIds: [input.skuId as never],
    familyId: input.familyId,
    catalogFamilyId:
      input.familyId === "marketing_assets"
        ? "marketing_assets"
        : input.familyId === "video_audio"
          ? "marketing_video"
          : "social_media",
    serviceName: input.serviceName,
    dependsOn: [],
    workflowState: "in_progress",
    responsibleRole: input.role,
    claimedByUserId: "staff-dev",
    claimedByDisplayName: "Staff",
    claimedAt: "2026-07-03T12:30:00.000Z",
  };
}

function campaignForJob(skuId: string, serviceName: string, deliverable: string): CampaignRecord {
  return campaign({
    approvedStudioPlan: {
      selectedServiceIds: [skuId as never],
      includedServiceIds: [skuId as never],
      additionalServiceIds: [],
      additionalCostUsd: 0,
      oneTimeTotalCents: 10000,
      monthlyTotalCents: 0,
      amountDueTodayCents: 10000,
      lineItems: [oneDeliverableLineItem(skuId, serviceName, deliverable)],
      approvedAt: "2026-07-01T09:00:00.000Z",
    },
  });
}

const ownerUser = {
  id: "tagia",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner"] as const,
};

const staffUser = {
  id: "staff-dev",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"] as const,
};

describe("production workspace gates", () => {
  it("blocks Building Concepts when materials are missing", () => {
    const job = acceptedJob();
    const materials: CampaignMaterialItem[] = [
      {
        id: "mat-1",
        category: "logo-brand",
        requirementLevel: "required",
        reviewStatus: "missing",
        contentKind: "file-metadata",
        label: "Logo",
        reason: "Needed",
        relatedServiceIds: ["sm-001"],
        promotionApprovedAt: "2026-07-01T10:00:00.000Z",
        uploadStatus: "none",
      },
    ];
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const gate = canTransitionToBuildingConcepts(job, materials, laneViews);
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code === "materials_incomplete")).toBe(true);
  });

  it("allows Building Concepts when materials complete and lane has capacity", () => {
    const job = acceptedJob();
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);
    const gate = canTransitionToBuildingConcepts(job, [], laneViews);
    expect(gate.allowed).toBe(true);
  });

  it("blocks Building Concepts until Acceptance Review is recorded", () => {
    const job = baseJob();
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);
    const gate = canTransitionToBuildingConcepts(job, [], laneViews);
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((reason) => reason.code === "acceptance_review_required")).toBe(true);
  });

  it("blocks Review Room submit until all deliverables are prepared", () => {
    const job = baseJob({ spineStatus: "building_concepts" });
    const deliverables = ["Concept set", "Final export"];
    expect(canSubmitForOwnerApproval(job, deliverables).allowed).toBe(false);

    const keys = resolveRequiredDeliverableKeys(deliverables);
    let prepared = job;
    for (const key of keys) {
      prepared = {
        ...prepared,
        deliverablePrep: [
          ...(prepared.deliverablePrep ?? []),
          {
            deliverableKey: key.key,
            label: key.label,
            preparedAt: "2026-07-03T13:00:00.000Z",
          },
        ],
      };
    }

    expect(allRequiredDeliverablesPrepared(prepared, deliverables)).toBe(true);
    expect(canSubmitForOwnerApproval(prepared, deliverables).allowed).toBe(true);
  });
});

describe("production workspace handoff actions", () => {
  it("acceptance review → start → prepare deliverables → submit opens client Review Room", () => {
    const job = baseJob();
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const accepted = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "record_acceptance_review" },
      staffUser,
      [],
      laneViews,
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.job.acceptanceReview?.status).toBe("accepted");

    const started = applyProductionWorkspacePatch(
      accepted.envelope,
      campaign(),
      job.jobId,
      { action: "start_building_concepts" },
      staffUser,
      [],
      laneViews,
    );
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.job.spineStatus).toBe("building_concepts");

    let currentEnv = started.envelope;
    const deliverables = resolveRequiredDeliverableKeys(["Concept set", "Final export"]);
    for (const def of deliverables) {
      const marked = applyProductionWorkspacePatch(
        currentEnv,
        campaign(),
        job.jobId,
        { action: "mark_deliverable_prepared", deliverableKey: def.key },
        staffUser,
        [],
        laneViews,
      );
      expect(marked.ok).toBe(true);
      if (!marked.ok) return;
      currentEnv = marked.envelope;
    }

    const submitted = applyProductionWorkspacePatch(
      withInternalQaPass(currentEnv),
      campaign(),
      job.jobId,
      { action: "submit_for_owner_approval" },
      staffUser,
      [],
      laneViews,
    );
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.job.ownerApprovalPending).toBeNull();
    expect(submitted.job.spineStatus).toBe("ready_for_review");
    expect(submitted.job.internalQaReviewAuthorization?.status).toBe(
      "ELIGIBLE_FOR_REVIEW",
    );
    expect(
      (submitted.envelope.jobActivityEvents ?? []).some((event) => event.kind === "status_change"),
    ).toBe(true);
  });

  it("routes owner send-back off support review to production rework", () => {
    const job = baseJob({ spineStatus: "building_concepts" });
    const env = envelope({
      ...job,
      ownerApprovalPending: "before_review",
      deliverablePrep: [
        {
          deliverableKey: "deliverable-0",
          label: "Concept set",
          preparedAt: "2026-07-03T14:00:00.000Z",
          preparedBy: { role: "staff", displayName: "Producer" },
        },
      ],
    });
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const sentBack = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "owner_send_back_for_review", note: "Headline hierarchy needs rework." },
      ownerUser,
      [],
      laneViews,
    );

    expect(sentBack.ok).toBe(true);
    if (!sentBack.ok) return;
    expect(sentBack.job.ownerApprovalPending).toBeNull();
    expect(sentBack.job.spineStatus).toBe("building_concepts");
    expect(sentBack.job.deliverablePrep?.[0]?.preparedAt).toBeUndefined();
    expect(sentBack.job.internalNotes?.some((note) => note.content.includes("send-back"))).toBe(
      true,
    );
  });

  it("routes owner hold and ask-team off support review with internal notes", () => {
    const job = baseJob({ spineStatus: "building_concepts", ownerApprovalPending: "before_review" });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const held = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "owner_hold_review_gate", note: "Need QA to verify brand colors." },
      ownerUser,
      [],
      laneViews,
    );
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(held.job.ownerApprovalPending).toBeNull();
    expect(held.job.internalNotes?.some((note) => note.content.includes("Owner hold"))).toBe(true);

    const askTeam = applyProductionWorkspacePatch(
      envelope({ ...job, ownerApprovalPending: "before_review" }),
      campaign(),
      job.jobId,
      { action: "owner_ask_team_review_gate", note: "Please confirm caption tone with strategy." },
      ownerUser,
      [],
      laneViews,
    );
    expect(askTeam.ok).toBe(true);
    if (!askTeam.ok) return;
    expect(askTeam.job.ownerApprovalPending).toBeNull();
    expect(askTeam.job.internalNotes?.some((note) => note.content.includes("ask-team"))).toBe(
      true,
    );
  });

  it("routes owner ask-client off support review to waiting_on_client", () => {
    const job = baseJob({ spineStatus: "building_concepts", ownerApprovalPending: "before_review" });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const asked = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      {
        action: "owner_ask_client_review_gate",
        clientMessage: "Please confirm which headline option you prefer before we open review.",
      },
      ownerUser,
      [],
      laneViews,
    );

    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    expect(asked.job.ownerApprovalPending).toBeNull();
    expect(asked.job.ownerAskResumeGate).toBe("before_review");
    expect(asked.job.spineStatus).toBe("waiting_on_client");
    expect(
      asked.envelope.jobCommunicationRecords?.some((row) => row.eventType === "owner_ask_client"),
    ).toBe(true);
    expect(asked.job.internalNotes?.some((note) => note.content.includes("client ask"))).toBe(
      true,
    );
  });

  it("routes owner send-back off the release gate to production rework", () => {
    const job = baseJob({
      spineStatus: "approved",
      ownerApprovalPending: "before_delivery",
    });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const sentBack = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "owner_send_back_for_release", note: "Final files need another QA pass." },
      ownerUser,
      [],
      laneViews,
    );

    expect(sentBack.ok).toBe(true);
    if (!sentBack.ok) return;
    expect(sentBack.job.ownerApprovalPending).toBeNull();
    expect(sentBack.job.spineStatus).toBe("building_concepts");
    expect(sentBack.job.internalNotes?.some((note) => note.content.includes("pre-delivery"))).toBe(
      true,
    );
  });

  it("routes owner hold and ask-team off the release gate with internal notes", () => {
    const job = baseJob({
      spineStatus: "approved",
      ownerApprovalPending: "before_delivery",
    });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const held = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "owner_hold_release_gate", note: "Verify deliverable filenames before release." },
      ownerUser,
      [],
      laneViews,
    );
    expect(held.ok).toBe(true);
    if (!held.ok) return;
    expect(held.job.ownerApprovalPending).toBeNull();
    expect(held.job.spineStatus).toBe("approved");

    const askTeam = applyProductionWorkspacePatch(
      envelope({
        ...job,
        ownerApprovalPending: "before_delivery",
      }),
      campaign(),
      job.jobId,
      { action: "owner_ask_team_release_gate", note: "QA — confirm client-safe export settings." },
      ownerUser,
      [],
      laneViews,
    );
    expect(askTeam.ok).toBe(true);
    if (!askTeam.ok) return;
    expect(askTeam.job.ownerApprovalPending).toBeNull();
    expect(askTeam.job.internalNotes?.some((note) => note.content.includes("ask-team"))).toBe(
      true,
    );
  });

  it("logs internal notes and working file refs", () => {
    const job = baseJob({ spineStatus: "building_concepts" });
    const env = envelope(job);
    const laneViews = resolveProductionLaneViews([
      { campaignName: "PW Demo", job, tasks: [] },
    ]);

    const note = applyProductionWorkspacePatch(
      env,
      campaign(),
      job.jobId,
      { action: "add_internal_note", content: "Check headline hierarchy" },
      staffUser,
      [],
      laneViews,
    );
    expect(note.ok).toBe(true);
    if (!note.ok) return;

    const ref = applyProductionWorkspacePatch(
      note.envelope,
      campaign(),
      job.jobId,
      { action: "add_working_file_ref", label: "Figma", url: "https://figma.com/file/demo" },
      staffUser,
      [],
      laneViews,
    );
    expect(ref.ok).toBe(true);
    if (!ref.ok) return;

    const events = ref.envelope.jobActivityEvents ?? [];
    expect(events.some((event) => event.kind === "internal_note")).toBe(true);
    expect(events.some((event) => event.kind === "working_file_ref")).toBe(true);
    expect(ref.job.internalNotes).toHaveLength(1);
    expect(ref.job.workingFileRefs).toHaveLength(1);
  });
});

describe("internal Work Packet handoff", () => {
  const scenarios: Array<{
    name: string;
    skuId: string;
    serviceName: string;
    deliverable: string;
    role: ProductionRole;
    phase: TaskPhase;
    familyId: ProductionTaskFamilyId;
  }> = [
    {
      name: "Flyer",
      skuId: "v2-rtu-flyer",
      serviceName: "Make Me a Flyer",
      deliverable: "One finished single-sided flyer design",
      role: "creative_production",
      phase: "creative",
      familyId: "marketing_assets",
    },
    {
      name: "Social Posts",
      skuId: "sm-001",
      serviceName: "Social Media Launch Set",
      deliverable: "Six branded static social posts",
      role: "strategy",
      phase: "strategy_content_direction",
      familyId: "social",
    },
    {
      name: "Short Video",
      skuId: "v2-rtu-short-video",
      serviceName: "Make Me a Short Video",
      deliverable: "One short-form video up to 60 seconds",
      role: "creative_production",
      phase: "creative_production",
      familyId: "video_audio",
    },
  ];

  it.each(scenarios)(
    "$name moves Production Workspace → Work Packet → Team Office return → client Review Room",
    ({ skuId, serviceName, deliverable, role, phase, familyId }) => {
      const job = baseJob({
        jobId: buildJobId("camp-pw", skuId as never),
        skuId: skuId as never,
        serviceName,
        spineStatus: "building_concepts",
      });
      const env = envelope(job);
      const campaignRecord = campaignForJob(skuId, serviceName, deliverable);
      const tasks = [taskForJob({ skuId, serviceName, phase, familyId, role })];
      const laneViews = resolveProductionLaneViews([
        { campaignName: "PW Demo", job, tasks },
      ]);

      const assigned = applyProductionWorkspacePatch(
        env,
        campaignRecord,
        job.jobId,
        { action: "assign_work_packet", role },
        staffUser,
        [],
        laneViews,
        undefined,
        tasks,
      );
      expect(assigned.ok).toBe(true);
      if (!assigned.ok) return;
      const packet = assigned.job.workPackets?.[0];
      expect(packet?.role).toBe(role);
      expect(packet?.assignmentEvents).toHaveLength(1);

      const returned = applyProductionWorkspacePatch(
        assigned.envelope,
        campaignRecord,
        job.jobId,
        {
          action: "return_work_packet_file",
          packetId: packet!.id,
          fileKind: "final",
          label: `${serviceName} final`,
          url: `https://files.local/${skuId}/final`,
          deliverableKey: "deliverable-0",
          note: "Returned from Team Office.",
        },
        staffUser,
        [],
        laneViews,
        undefined,
        tasks,
      );
      expect(returned.ok).toBe(true);
      if (!returned.ok) return;
      expect(returned.job.workPackets?.[0]?.returnedFileRefs).toHaveLength(1);
      expect(returned.job.deliverablePrep?.[0]?.preparedAt).toBeTruthy();
      expect(returned.job.workingFileRefs?.[0]?.url).toContain(`/final`);

      const submitted = applyProductionWorkspacePatch(
        withInternalQaPass(returned.envelope, skuId, familyId),
        campaignRecord,
        job.jobId,
        { action: "submit_for_owner_approval" },
        staffUser,
        [],
        laneViews,
        undefined,
        tasks,
      );
      expect(submitted.ok).toBe(true);
      if (!submitted.ok) return;
      expect(submitted.job.ownerApprovalPending).toBeNull();
      expect(submitted.job.spineStatus).toBe("ready_for_review");
      expect(submitted.job.internalQaReviewAuthorization?.status).toBe(
        "ELIGIBLE_FOR_REVIEW",
      );

      const events = submitted.envelope.jobActivityEvents ?? [];
      expect(events.some((event) => event.kind === "work_packet_assigned")).toBe(true);
      expect(events.some((event) => event.kind === "work_packet_returned")).toBe(true);
      expect(events.some((event) => event.kind === "approval")).toBe(true);
    },
  );
});
