import { describe, expect, it } from "vitest";

import type { CampaignTaskItem, QaRecord } from "@/lib/campaign-tasks/types";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import { canClientAccessJobReview } from "@/lib/job-control/review-room-access";
import {
  canSubmitForOwnerApproval,
} from "@/lib/job-control/production-workspace-gates";
import type { PurchasedJobRecord } from "@/lib/job-control/types";

import { isOwnerUser } from "@/lib/campaign-store/access";
import { applyProductionWorkspacePatch } from "@/lib/job-control/production-workspace-actions";
import { buildJobId } from "@/lib/job-control/lane-map";
import { resolveProductionLaneViews } from "@/lib/job-control/capacity";

import {
  buildInternalQaReviewAuthorization,
  evaluateReviewEligibility,
  isEligibleForReview,
  studioReviewEligibilityV1,
} from "./index";

function task(overrides: Partial<CampaignTaskItem> & Pick<CampaignTaskItem, "id" | "familyId" | "phase" | "relatedServiceIds">): CampaignTaskItem {
  return {
    title: "Task",
    status: "ready",
    catalogFamilyId: "marketing_assets",
    serviceName: "Service",
    dependsOn: [],
    workflowState: "complete",
    ...overrides,
  };
}

function passRecord(
  overrides: Partial<QaRecord> & Pick<QaRecord, "id" | "taskId">,
): QaRecord {
  return {
    campaignId: "camp-1",
    createdAt: "2026-08-10T12:00:00.000Z",
    actorUserId: "qa-1",
    actorDisplayName: "QA",
    actorRole: "qa",
    action: "qa_pass",
    checks: ["quality"],
    ...overrides,
  };
}

function job(overrides: Partial<PurchasedJobRecord> = {}): PurchasedJobRecord {
  return {
    jobId: buildJobId("camp-1", "v2-rtu-flyer"),
    campaignId: "camp-1",
    skuId: "v2-rtu-flyer",
    serviceName: "Flyer",
    spineStatus: "building_concepts",
    productionLane: "quick",
    intakeComplete: true,
    updatedAt: "2026-08-10T12:00:00.000Z",
    ...overrides,
  };
}

describe("PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1", () => {
  it("QA-passed exact design artifact → ELIGIBLE_FOR_REVIEW", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const record = passRecord({
      id: "qa-1",
      taskId: qaTask.id,
      workVersionId: "wv-1",
      designQualityEvidence: {
        evaluation: {
          skuId: "v2-rtu-flyer",
          fixtureId: "f1",
          ok: true,
          findings: [],
          checkedAt: "2026-08-10T12:00:00.000Z",
          deterministicFailCount: 0,
          judgmentRequired: true,
          summary: "ok",
        },
        attestations: {
          hierarchyReviewed: true,
          readabilityReviewed: true,
          spacingCompositionReviewed: true,
          brandFitReviewed: true,
          genericnessRejected: true,
          exportReadinessReviewed: true,
          notes: "bound visual pass",
        },
        gatePassed: true,
      },
      artifactBinding: {
        workVersionId: "wv-1",
        artifactIds: ["art-v1"],
        contentSha256s: ["hash-v1"],
      },
    });

    const decision = evaluateReviewEligibility({
      jobId: "camp-1__v2-rtu-flyer",
      campaignId: "camp-1",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [record],
      reviewCandidate: {
        artifactId: "art-v1",
        workVersionId: "wv-1",
        contentSha256: "hash-v1",
      },
    });

    expect(decision.outcome).toBe("ELIGIBLE_FOR_REVIEW");
    expect(isEligibleForReview(decision)).toBe(true);
    expect(decision.escalationTarget).toBe("none");
    expect(buildInternalQaReviewAuthorization(decision)?.qaRecordIds).toEqual([
      "qa-1",
    ]);
  });

  it("missing QA → BLOCKED_FOR_INTERNAL_QA", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [],
    });
    expect(decision.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");
    expect(decision.blockCodes).toContain("missing_qa");
    expect(decision.customerMessage).toBe(
      studioReviewEligibilityV1.customerCopy.stillPreparing,
    );
  });

  it("QA fail → blocked; routine failure does not escalate Owner", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [
        {
          ...passRecord({ id: "qa-fail-1", taskId: qaTask.id }),
          action: "qa_fail",
          category: "production_correction",
        },
      ],
    });
    expect(decision.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");
    expect(decision.blockCodes).toContain("qa_failed");
    expect(decision.escalationTarget).toBe("none");
  });

  it("V1 pass does not authorize V2 hash/version", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const record = passRecord({
      id: "qa-v1",
      taskId: qaTask.id,
      workVersionId: "wv-1",
      designQualityEvidence: {
        evaluation: {
          skuId: "v2-rtu-flyer",
          fixtureId: "f1",
          ok: true,
          findings: [],
          checkedAt: "t",
          deterministicFailCount: 0,
          judgmentRequired: true,
          summary: "ok",
        },
        attestations: {
          hierarchyReviewed: true,
          readabilityReviewed: true,
          spacingCompositionReviewed: true,
          brandFitReviewed: true,
          genericnessRejected: true,
          exportReadinessReviewed: true,
          notes: "v1",
        },
        gatePassed: true,
      },
      artifactBinding: {
        workVersionId: "wv-1",
        artifactIds: ["art-v1"],
        contentSha256s: ["hash-v1"],
      },
    });

    const wrongVersion = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [record],
      reviewCandidate: { workVersionId: "wv-2", contentSha256: "hash-v1" },
    });
    expect(wrongVersion.blockCodes).toContain("wrong_version");

    const wrongHash = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [record],
      reviewCandidate: { workVersionId: "wv-1", contentSha256: "hash-v2" },
    });
    expect(wrongHash.blockCodes).toContain("wrong_hash");

    const wrongArtifact = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [record],
      reviewCandidate: { artifactId: "art-v2" },
    });
    expect(wrongArtifact.blockCodes).toContain("wrong_artifact");
  });

  it("newer production version supersedes prior QA pass", () => {
    const qaTask = task({
      id: "sm-001:qa",
      familyId: "social",
      phase: "qa",
      relatedServiceIds: ["sm-001"],
      catalogFamilyId: "social_media",
    });
    const record = passRecord({
      id: "qa-old",
      taskId: qaTask.id,
      workVersionId: "wv-1",
      createdAt: "2026-08-10T10:00:00.000Z",
    });
    const production = {
      campaignId: "c",
      version: 1,
      planFingerprint: "p",
      workUnits: [],
      syncedAt: "t",
      updatedAt: "t",
      versions: [
        {
          id: "wv-1",
          workUnitId: "wu",
          taskId: qaTask.id,
          stage: "creative",
          reason: "initial",
          contentKind: "plain_text",
          body: "v1",
          createdAt: "2026-08-10T10:00:00.000Z",
          createdByUserId: "u",
          createdByDisplayName: "U",
        },
        {
          id: "wv-2",
          workUnitId: "wu",
          taskId: qaTask.id,
          stage: "creative",
          reason: "qa_revision",
          contentKind: "plain_text",
          body: "v2",
          createdAt: "2026-08-10T11:00:00.000Z",
          createdByUserId: "u",
          createdByDisplayName: "U",
        },
      ],
    } as unknown as ServerProductionEnvelope;

    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "sm-001",
      tasks: [qaTask],
      qaRecords: [record],
      production,
    });
    expect(decision.blockCodes).toContain("superseded");
  });

  it("corrected V2 requires fresh QA pass bound to V2", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const v2 = passRecord({
      id: "qa-v2",
      taskId: qaTask.id,
      workVersionId: "wv-2",
      designQualityEvidence: {
        evaluation: {
          skuId: "v2-rtu-flyer",
          fixtureId: "f2",
          ok: true,
          findings: [],
          checkedAt: "t",
          deterministicFailCount: 0,
          judgmentRequired: true,
          summary: "ok",
        },
        attestations: {
          hierarchyReviewed: true,
          readabilityReviewed: true,
          spacingCompositionReviewed: true,
          brandFitReviewed: true,
          genericnessRejected: true,
          exportReadinessReviewed: true,
          notes: "v2",
        },
        gatePassed: true,
      },
      artifactBinding: {
        workVersionId: "wv-2",
        artifactIds: ["art-v2"],
        contentSha256s: ["hash-v2"],
      },
    });
    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [v2],
      reviewCandidate: {
        workVersionId: "wv-2",
        artifactId: "art-v2",
        contentSha256: "hash-v2",
      },
    });
    expect(decision.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("Copy path requires copyQuality gatePassed", () => {
    const qaTask = task({
      id: "em-001:qa",
      familyId: "copy_channels",
      phase: "qa",
      relatedServiceIds: ["em-001"],
      catalogFamilyId: "email_marketing",
    });
    const withoutGate = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "em-001",
      tasks: [qaTask],
      qaRecords: [passRecord({ id: "q1", taskId: qaTask.id })],
    });
    expect(withoutGate.blockCodes).toContain("family_gate_missing");

    const withGate = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "em-001",
      tasks: [qaTask],
      qaRecords: [
        passRecord({
          id: "q2",
          taskId: qaTask.id,
          copyQualityEvidence: {
            evaluation: {
              skuId: "em-001",
              ok: true,
              findings: [],
              checkedAt: "t",
              summary: "ok",
            } as never,
            attestations: { notes: "ok" } as never,
            gatePassed: true,
          },
        }),
      ],
    });
    expect(withGate.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("Voice MP3 path requires audioQuality gatePassed", () => {
    const qaTask = task({
      id: "ap-001:qa",
      familyId: "video_audio",
      phase: "qa",
      relatedServiceIds: ["ap-001"],
      catalogFamilyId: "ai_voice_over",
    });
    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "ap-001",
      tasks: [qaTask],
      qaRecords: [
        passRecord({
          id: "audio-pass",
          taskId: qaTask.id,
          audioQualityEvidence: {
            evaluation: {
              skuId: "ap-001",
              ok: true,
              findings: [],
              checkedAt: "t",
              deterministicFailCount: 0,
              judgmentRequired: true,
              generationCapability: "present_and_usable",
              summary: "ok",
            },
            attestations: { notes: "listen ok" } as never,
            gatePassed: true,
          },
          artifactBinding: {
            artifactIds: ["mp3-1"],
            contentSha256s: ["mp3-hash"],
            scriptVersionId: "script-1",
          },
        }),
      ],
      reviewCandidate: { contentSha256: "mp3-hash", artifactId: "mp3-1" },
    });
    expect(decision.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("Video render without videoQuality evidence does not Review", () => {
    const qaTask = task({
      id: "v2-rtu-short-video:qa",
      familyId: "video_audio",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-short-video"],
      catalogFamilyId: "marketing_video",
    });
    const renderOnly = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-short-video",
      tasks: [qaTask],
      qaRecords: [passRecord({ id: "render", taskId: qaTask.id })],
    });
    expect(renderOnly.blockCodes).toContain("video_render_without_qa");

    const withVideoQa = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-short-video",
      tasks: [qaTask],
      qaRecords: [
        passRecord({
          id: "video-pass",
          taskId: qaTask.id,
          videoQualityEvidence: {
            evaluation: {
              skuId: "v2-rtu-short-video",
              ok: true,
              findings: [],
              checkedAt: "t",
              deterministicFailCount: 0,
              judgmentRequired: true,
              assemblyCapability: "present_and_usable",
              summary: "ok",
            },
            attestations: { timingReviewed: true } as never,
            gatePassed: true,
          },
          artifactBinding: {
            artifactIds: ["vid-1"],
            contentSha256s: ["vid-hash"],
          },
        }),
      ],
      reviewCandidate: { contentSha256: "vid-hash" },
    });
    expect(withVideoQa.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("Landing Page checklist-only PASS is not enough; machine QA evidence required", () => {
    const landingQa = task({
      id: "rm-j005:qa",
      familyId: "landing_page",
      phase: "qa",
      relatedServiceIds: ["rm-j005"],
      catalogFamilyId: "landing_page_content",
    });
    const checklistOnly = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "rm-j005",
      tasks: [landingQa],
      qaRecords: [passRecord({ id: "lp", taskId: landingQa.id })],
    });
    expect(checklistOnly.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");
    expect(checklistOnly.blockCodes).toContain("family_gate_missing");

    const withLanding = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "rm-j005",
      tasks: [landingQa],
      qaRecords: [
        passRecord({
          id: "lp-ok",
          taskId: landingQa.id,
          landingPageQaEvidence: {
            artifactId: "html-1",
            contentSha256: "landing-hash",
            workPacketVersion: "wp-1",
            machineChecksOk: true,
            checkIds: ["cta_href_exact", "responsive_css_present"],
          },
          artifactBinding: {
            artifactIds: ["html-1"],
            contentSha256s: ["landing-hash"],
          },
        }),
      ],
    });
    expect(withLanding.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("Profile Kit requires copy + design method QA evidence, not checklist alone", () => {
    const kitQa = task({
      id: "rm-j002:qa",
      familyId: "social",
      phase: "qa",
      relatedServiceIds: ["rm-j002"],
      catalogFamilyId: "social_media",
    });
    const checklistOnly = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "rm-j002",
      tasks: [kitQa],
      qaRecords: [passRecord({ id: "kit", taskId: kitQa.id })],
    });
    expect(checklistOnly.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");

    const withMethods = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "rm-j002",
      tasks: [kitQa],
      qaRecords: [
        passRecord({
          id: "kit-ok",
          taskId: kitQa.id,
          copyQualityEvidence: {
            evaluation: { skuId: "rm-j002", ok: true } as never,
            attestations: { notes: "bio ok" } as never,
            gatePassed: true,
          },
          designQualityEvidence: {
            evaluation: {
              skuId: "rm-j002",
              fixtureId: "f",
              ok: true,
              findings: [],
              checkedAt: "t",
              deterministicFailCount: 0,
              judgmentRequired: true,
              summary: "ok",
            },
            attestations: {
              hierarchyReviewed: true,
              readabilityReviewed: true,
              spacingCompositionReviewed: true,
              brandFitReviewed: true,
              genericnessRejected: true,
              exportReadinessReviewed: true,
              notes: "avatar ok",
            },
            gatePassed: true,
          },
          artifactBinding: {
            artifactIds: ["avatar-1"],
            contentSha256s: ["kit-hash"],
          },
        }),
      ],
    });
    expect(withMethods.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("method-covered SKU requires underlying certified method QA (not empty checklist)", () => {
    const methodCovered = task({
      id: "sm-001:qa",
      familyId: "social",
      phase: "qa",
      relatedServiceIds: ["sm-001"],
      catalogFamilyId: "social_media",
    });
    const checklistOnly = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "sm-001",
      tasks: [methodCovered],
      qaRecords: [passRecord({ id: "sm", taskId: methodCovered.id })],
    });
    expect(checklistOnly.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");

    const withDesignMethod = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "sm-001",
      tasks: [methodCovered],
      qaRecords: [
        passRecord({
          id: "sm-ok",
          taskId: methodCovered.id,
          designQualityEvidence: {
            evaluation: {
              skuId: "sm-001",
              fixtureId: "f",
              ok: true,
              findings: [],
              checkedAt: "t",
              deterministicFailCount: 0,
              judgmentRequired: true,
              summary: "ok",
            },
            attestations: {
              hierarchyReviewed: true,
              readabilityReviewed: true,
              spacingCompositionReviewed: true,
              brandFitReviewed: true,
              genericnessRejected: true,
              exportReadinessReviewed: true,
              notes: "method design",
            },
            gatePassed: true,
          },
        }),
      ],
    });
    expect(withDesignMethod.outcome).toBe("ELIGIBLE_FOR_REVIEW");

    const copyMethodTask = task({
      id: "em-001-monthly:qa",
      familyId: "copy_channels",
      phase: "qa",
      relatedServiceIds: ["em-001-monthly"],
      catalogFamilyId: "email_marketing",
    });
    const copyMethod = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "em-001-monthly",
      tasks: [copyMethodTask],
      qaRecords: [
        passRecord({
          id: "em-ok",
          taskId: copyMethodTask.id,
          copyQualityEvidence: {
            evaluation: { skuId: "em-001-monthly", ok: true } as never,
            attestations: { notes: "ok" } as never,
            gatePassed: true,
          },
        }),
      ],
    });
    expect(copyMethod.outcome).toBe("ELIGIBLE_FOR_REVIEW");
  });

  it("routine QA PASS reaches Review via staff submit — Tagia action not required", () => {
    expect(studioReviewEligibilityV1.routineReviewAuthorization).toBe(
      "owner_independent",
    );
    expect(isOwnerUser({ roles: ["staff"] } as never)).toBe(false);

    const staffUser = {
      id: "staff-1",
      email: "staff@local.dev",
      displayName: "Staff",
      roles: ["staff"] as const,
    };
    const now = "2026-08-10T12:00:00.000Z";
    const jobRecord: PurchasedJobRecord = {
      jobId: buildJobId("camp-oi", "sm-001"),
      campaignId: "camp-oi",
      skuId: "sm-001",
      serviceName: "Social",
      spineStatus: "building_concepts",
      productionLane: "quick",
      intakeComplete: true,
      deliverablePrep: [
        {
          deliverableKey: "deliverable-0",
          label: "Concept set",
          preparedAt: now,
          preparedBy: { role: "staff", displayName: "Staff" },
        },
        {
          deliverableKey: "deliverable-1",
          label: "Final export",
          preparedAt: now,
          preparedBy: { role: "staff", displayName: "Staff" },
        },
      ],
      updatedAt: now,
    };
    const qaTask = task({
      id: "sm-001:qa",
      familyId: "social",
      phase: "qa",
      relatedServiceIds: ["sm-001"],
      catalogFamilyId: "social_media",
    });
    const env = {
      campaignId: "camp-oi",
      tasks: [qaTask],
      planFingerprint: "t",
      updatedAt: now,
      version: 1,
      syncedAt: now,
      jobRecords: [jobRecord],
      jobActivityEvents: [],
      qaRecords: [
        passRecord({
          id: "qa-oi",
          taskId: qaTask.id,
          designQualityEvidence: {
            evaluation: {
              skuId: "sm-001",
              fixtureId: "f",
              ok: true,
              findings: [],
              checkedAt: now,
              deterministicFailCount: 0,
              judgmentRequired: true,
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
        }),
      ],
    };
    const campaign = {
      campaignId: "camp-oi",
      campaignName: "OI",
      campaignStatus: "BUILDING_CONCEPTS",
      campaignDescription: "",
      estimatedCompletion: "",
      packageId: "custom-studio-plan",
      packageLabel: "Custom",
      paymentReceivedAt: now,
      approvedStudioPlan: {
        selectedServiceIds: ["sm-001"],
        includedServiceIds: ["sm-001"],
        additionalServiceIds: [],
        additionalCostUsd: 0,
        oneTimeTotalCents: 10000,
        monthlyTotalCents: 0,
        amountDueTodayCents: 10000,
        lineItems: [
          {
            skuId: "sm-001",
            serviceId: "sm-001",
            serviceName: "Social",
            billingType: "one_time",
            exactPriceCents: 10000,
            priceDisplay: "$100",
            deliverables: ["Concept set", "Final export"],
            exclusions: [],
            timingWindowLabel: "3–5 days",
            revisionRule: "1 round",
            clientResponsibilities: [],
            executionResponsibility: "Studio",
          },
        ],
        approvedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    } as never;

    const submitted = applyProductionWorkspacePatch(
      env,
      campaign,
      jobRecord.jobId,
      { action: "submit_for_owner_approval" },
      staffUser,
      [],
      resolveProductionLaneViews([
        { campaignName: "OI", job: jobRecord, tasks: [qaTask] },
      ]),
    );
    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.job.spineStatus).toBe("ready_for_review");
    expect(submitted.job.ownerApprovalPending).toBeNull();
    expect(submitted.job.internalQaReviewAuthorization?.status).toBe(
      "ELIGIBLE_FOR_REVIEW",
    );
  });

  it("legacy owner_approve_for_review remains Owner-exception only", () => {
    const staffUser = {
      id: "staff-1",
      email: "staff@local.dev",
      displayName: "Staff",
      roles: ["staff"] as const,
    };
    const jobRecord = job({
      jobId: buildJobId("camp-1", "v2-rtu-flyer"),
      spineStatus: "building_concepts",
      ownerApprovalPending: "before_review",
    });
    const env = {
      campaignId: "camp-1",
      tasks: [],
      planFingerprint: "t",
      updatedAt: "t",
      version: 1,
      syncedAt: "t",
      jobRecords: [jobRecord],
      jobActivityEvents: [],
      qaRecords: [],
    };
    const denied = applyProductionWorkspacePatch(
      env,
      {
        campaignId: "camp-1",
        campaignName: "x",
        campaignStatus: "BUILDING_CONCEPTS",
        campaignDescription: "",
        estimatedCompletion: "",
        packageId: "custom-studio-plan",
        packageLabel: "",
        createdAt: "t",
        updatedAt: "t",
      } as never,
      jobRecord.jobId,
      { action: "owner_approve_for_review" },
      staffUser,
      [],
      resolveProductionLaneViews([
        { campaignName: "x", job: jobRecord, tasks: [] },
      ]),
    );
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.status).toBe(403);
    expect(denied.error).toMatch(/owner/i);
  });

  it("routine QA FAIL blocks Review without Owner escalation", () => {
    const qaTask = task({
      id: "v2-rtu-flyer:qa",
      familyId: "marketing_assets",
      phase: "qa",
      relatedServiceIds: ["v2-rtu-flyer"],
    });
    const decision = evaluateReviewEligibility({
      jobId: "j",
      campaignId: "c",
      skuId: "v2-rtu-flyer",
      tasks: [qaTask],
      qaRecords: [
        {
          ...passRecord({ id: "fail", taskId: qaTask.id }),
          action: "qa_fail",
          category: "production_correction",
        },
      ],
    });
    expect(decision.outcome).toBe("BLOCKED_FOR_INTERNAL_QA");
    expect(decision.escalationTarget).toBe("none");
  });

  it("Review entry / access fails closed without internal QA authorization", () => {
    expect(
      canClientAccessJobReview({ spineStatus: "ready_for_review" }),
    ).toBe(false);
    expect(
      canClientAccessJobReview({
        spineStatus: "ready_for_review",
        internalQaReviewAuthorization: { status: "ELIGIBLE_FOR_REVIEW" },
      }),
    ).toBe(true);

    const gate = canSubmitForOwnerApproval(job(), ["Concept set"], {
      tasks: [],
      qaRecords: [],
    });
    expect(gate.allowed).toBe(false);
    expect(gate.reasons.some((r) => r.code === "internal_qa_blocked")).toBe(
      true,
    );
  });

  it("preserves package identity and does not invent Owner escalation for QA fail", () => {
    expect(studioReviewEligibilityV1.packageId).toBe(
      "PRODUCTION-ASSURANCE-QA-BEFORE-REVIEW-1",
    );
    expect(Object.values(studioReviewEligibilityV1.outcomes)).toEqual([
      "ELIGIBLE_FOR_REVIEW",
      "BLOCKED_FOR_INTERNAL_QA",
    ]);
  });

  it("leaves pre-acceptance, CR-D5, and post-pay Acceptance Review modules untouched", async () => {
    const pre = await import("@/lib/studio-pre-acceptance");
    expect(typeof pre.evaluatePreAcceptance).toBe("function");
    const phase = await import("@/lib/studio-conversation-phase-gates");
    expect(typeof phase.evaluateConversationPhaseGate).toBe("function");
    const postPay = await import("@/lib/job-control/acceptance-review");
    expect(typeof postPay.buildAcceptedAcceptanceReview).toBe("function");
  });
});
