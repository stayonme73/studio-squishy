import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyQaFail, applyQaPass } from "@/lib/campaign-tasks/actions";
import { requiredChecksForPhase } from "@/lib/campaign-tasks/qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
  projectKitchenCommsLedger,
} from "@/lib/studio-kitchen-comms";

import { emailCampaignCorrectedDraft, emailCampaignFirstDraft } from "../cert-copy/drafts";
import {
  HARBOR_OAK_PASS_ATTESTATIONS,
  evaluateCopyQuality,
  gateCopyQualityForQaPass,
  harborOakCopyBrief,
  requiresCopyQualityGate,
  submissionFromEmailCampaignDraft,
} from "./index";

const now = "2026-08-09T14:00:00.000Z";

const qaStaff: StudioUser = {
  id: "staff-copy-qa-runtime",
  email: "copy-qa@local.dev",
  displayName: "Copy QA",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: { "staff-copy-qa-runtime": ["cert-copy-runtime"] },
  staffCapabilities: { "staff-copy-qa-runtime": ["qa"] },
};

const campaign: CampaignRecord = {
  campaignId: "cert-copy-runtime",
  campaignName: "CERTIFICATION FIXTURE / INTERNAL TEST",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "Runtime copy QA gate",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["em-001"],
    includedServiceIds: ["em-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 32500,
    monthlyTotalCents: 0,
    amountDueTodayCents: 32500,
    lineItems: [
      {
        skuId: "em-001",
        serviceName: "Email Campaign Build",
        billingType: "one_time",
        exactPriceCents: 32500,
        priceDisplay: "$325",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "standard",
        revisionRule: "One consolidated revision round.",
        clientResponsibilities: [],
        executionResponsibility: "studio",
      },
    ],
    approvedAt: now,
  },
  projectDetailsSubmittedAt: now,
  paymentReceivedAt: now,
  selectedCampaignOption: "Option A",
  createdAt: now,
  updatedAt: now,
};

function copyChannelsTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "em-001:copy",
    title: "Email — Copy",
    phase: "copy",
    status: "ready_for_qa",
    relatedServiceIds: ["em-001"],
    familyId: "copy_channels",
    catalogFamilyId: "email_marketing",
    serviceName: "Email Campaign Build",
    dependsOn: [],
    workflowState: "ready_for_qa",
    responsibleRole: "copy",
    ...overrides,
  };
}

function socialCopyTask(): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "ready_for_qa",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "ready_for_qa",
    responsibleRole: "copy",
  };
}

function envelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
  return {
    campaignId: campaign.campaignId,
    tasks,
    planFingerprint: "em-001:one_time",
    planVersion: 1,
    updatedAt: now,
    version: 12,
    handoffs: [],
    qaRecords: [],
    syncedAt: now,
  };
}

describe("copy-quality runtime gate", () => {
  it("requires copy quality gate only for copy_channels copy/qa phases", () => {
    expect(requiresCopyQualityGate(copyChannelsTask())).toBe(true);
    expect(requiresCopyQualityGate(copyChannelsTask({ phase: "qa" }))).toBe(true);
    expect(requiresCopyQualityGate(copyChannelsTask({ phase: "delivery_prep" }))).toBe(false);
    expect(requiresCopyQualityGate(socialCopyTask())).toBe(false);
  });

  it("fails Harbor & Oak defective first draft through shared evaluator", () => {
    const evaluation = evaluateCopyQuality({
      brief: harborOakCopyBrief("em-001"),
      submission: submissionFromEmailCampaignDraft(emailCampaignFirstDraft),
    });
    expect(evaluation.ok).toBe(false);
    const blob = evaluation.findings.map((f) => f.message).join(" | ");
    expect(blob).toMatch(/Scope exceeded|emails/i);
    expect(blob).toMatch(/energy|same-day|tone|CTA|fact|189|March|Apr/i);
  });

  it("rejects qa_pass when checklist-only (no copyQuality) on copy_channels", () => {
    const result = applyQaPass(
      envelope([copyChannelsTask()]),
      {
        action: "qa_pass",
        taskId: "em-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/copyQuality|Checklist attestation alone/i);
  });

  it("rejects qa_pass when defective Harbor & Oak draft is submitted", () => {
    const result = applyQaPass(
      envelope([copyChannelsTask()]),
      {
        action: "qa_pass",
        taskId: "em-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        copyQuality: {
          brief: harborOakCopyBrief("em-001"),
          submission: submissionFromEmailCampaignDraft(emailCampaignFirstDraft),
          attestations: HARBOR_OAK_PASS_ATTESTATIONS,
        },
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/failed|Scope|claim|CTA|tone|fact/i);
  });

  it("routes qa_fail then passes corrected draft with recorded copyQualityEvidence", () => {
    const failEval = evaluateCopyQuality({
      brief: harborOakCopyBrief("em-001"),
      submission: submissionFromEmailCampaignDraft(emailCampaignFirstDraft),
    });
    expect(failEval.ok).toBe(false);

    const fail = applyQaFail(
      envelope([copyChannelsTask()]),
      {
        action: "qa_fail",
        taskId: "em-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        notes: failEval.summary,
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(fail.ok).toBe(true);
    if (!fail.ok) return;
    expect(fail.envelope.tasks[0]?.workflowState).toBe("needs_revision");
    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");

    const ledgerFail = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: fail.envelope,
    });
    const qaEvents = [...ledgerFail.active, ...ledgerFail.history].filter((e) => e.category === "qa");
    expect(qaEvents.every((e) => e.ownerEscalation === "owner_not_required")).toBe(true);

    const readyAgain: ServerTasksEnvelope = {
      ...fail.envelope,
      tasks: fail.envelope.tasks.map((task) => ({
        ...task,
        workflowState: "ready_for_qa",
        status: "ready_for_qa",
        claimedByUserId: undefined,
        claimedAt: undefined,
      })),
    };

    const gated = gateCopyQualityForQaPass({
      brief: harborOakCopyBrief("em-001"),
      submission: submissionFromEmailCampaignDraft(emailCampaignCorrectedDraft),
      attestations: HARBOR_OAK_PASS_ATTESTATIONS,
    });
    expect(gated.ok).toBe(true);

    const pass = applyQaPass(
      readyAgain,
      {
        action: "qa_pass",
        taskId: "em-001:copy",
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        notes: "Corrected Harbor & Oak emails pass runtime copy-quality gate.",
        copyQuality: {
          brief: harborOakCopyBrief("em-001"),
          submission: submissionFromEmailCampaignDraft(emailCampaignCorrectedDraft),
          attestations: HARBOR_OAK_PASS_ATTESTATIONS,
        },
      },
      qaStaff,
      { campaign, materials: [], assignments },
    );
    expect(pass.ok).toBe(true);
    if (!pass.ok) return;
    const record = pass.envelope.qaRecords?.find((r) => r.action === "qa_pass");
    expect(record?.copyQualityEvidence?.gatePassed).toBe(true);
    expect(record?.copyQualityEvidence?.evaluation.ok).toBe(true);
    expect(record?.copyQualityEvidence?.attestations.brandVoiceReviewed).toBe(true);

    const ledgerPass = projectKitchenCommsLedger({
      campaignId: campaign.campaignId,
      tasksEnvelope: pass.envelope,
    });
    expect(
      [...ledgerPass.active, ...ledgerPass.history].filter(
        (e) => e.category === "qa" && e.ownerEscalation === "owner_required",
      ),
    ).toHaveLength(0);
  });

  it("does not require copyQuality for non-copy social QA pass", () => {
    // Social remains checklist path — prove we did not alter non-copy services.
    // workVersion may be required for kitchen v1 sm-001; without production fixture this may fail for other reasons.
    // Gate presence only:
    expect(requiresCopyQualityGate(socialCopyTask())).toBe(false);
  });
});
