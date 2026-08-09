import { describe, expect, it, vi } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments-shared";
import { applyClaim, applyQaFail, applyQaPass } from "@/lib/campaign-tasks/actions";
import { buildKitchenCopyStageFixture } from "@/lib/campaign-tasks/kitchen-test-fixtures";
import { requiredChecksForPhase } from "@/lib/campaign-tasks/qa-checklists";
import type { CampaignTaskItem, ServerTasksEnvelope } from "@/lib/campaign-tasks/types";
import {
  ownerEscalationForRoutineOperationalEvent,
  projectKitchenCommsLedger,
} from "@/lib/studio-kitchen-comms";
import { resolveServiceProductionContract } from "@/lib/studio-kitchen-production";

import { certCopyQaSummary } from "./content-qa";
import {
  emailCampaignCorrectedDraft,
  emailCampaignFirstDraft,
  marketingCopyTotalWords,
} from "./drafts";
import {
  CERT_COPY_CAMPAIGN_ID,
  CERT_COPY_FIXTURE_LABEL,
  CERT_COPY_PACKAGE_ID,
  CERT_COPY_SKUS,
  certCopyCustomerBrief,
} from "./fixture";

vi.mock("@/lib/draft-intake", () => ({
  readLastDraftIntake: () => null,
}));

const now = "2026-08-09T12:00:00.000Z";

const copyStaff: StudioUser = {
  id: "staff-cert-copy",
  email: "cert-copy@local.dev",
  displayName: "Cert Copy Producer",
  roles: ["staff"],
};

const qaStaff: StudioUser = {
  id: "staff-cert-qa",
  email: "cert-qa@local.dev",
  displayName: "Cert QA",
  roles: ["staff"],
};

const owner: StudioUser = {
  id: "tagia-cert",
  email: "tagia@local.dev",
  displayName: "Tagia",
  roles: ["owner", "client"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-cert-copy": ["campaign-1"],
    "staff-cert-qa": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-cert-copy": ["copy"],
    "staff-cert-qa": ["qa"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "campaign-1",
  campaignName: CERT_COPY_FIXTURE_LABEL,
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "CERTIFICATION FIXTURE / INTERNAL TEST",
  estimatedCompletion: "Soon",
  packageId: "custom-studio-plan",
  packageLabel: "Custom Studio Plan",
  approvedStudioPlan: {
    selectedServiceIds: ["sm-001"],
    includedServiceIds: ["sm-001"],
    additionalServiceIds: [],
    additionalCostUsd: 0,
    oneTimeTotalCents: 50000,
    monthlyTotalCents: 0,
    amountDueTodayCents: 50000,
    lineItems: [
      {
        skuId: "sm-001",
        serviceName: "Social",
        billingType: "one_time",
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: [],
        exclusions: [],
        timingWindowLabel: "2 weeks",
        revisionRule: "1 round",
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

function copyReadyTask(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "ready_for_qa",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "ready_for_qa",
    responsibleRole: "copy",
    ...overrides,
  };
}

function tasksEnvelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
  return {
    campaignId: "campaign-1",
    tasks,
    planFingerprint: "sm-001:one_time",
    planVersion: 1,
    updatedAt: now,
    version: 4,
    handoffs: [],
    qaRecords: [],
    syncedAt: now,
  };
}

describe("KITCHEN-PRODUCTION-CERT-COPY-1", () => {
  it("labels the fixture as certification/internal test only", () => {
    expect(certCopyCustomerBrief.label).toBe(CERT_COPY_FIXTURE_LABEL);
    expect(certCopyCustomerBrief.packageId).toBe(CERT_COPY_PACKAGE_ID);
    expect(certCopyCustomerBrief.campaignId).toBe(CERT_COPY_CAMPAIGN_ID);
    expect(certCopyCustomerBrief.prohibitedClaims.length).toBeGreaterThan(0);
    expect(certCopyCustomerBrief.whyChallenging.length).toBeGreaterThan(40);
  });

  it("resolves production contracts for all copy-led cert SKUs with copy producer", () => {
    for (const sku of CERT_COPY_SKUS) {
      const result = resolveServiceProductionContract(sku);
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") continue;
      expect(result.contract.producerRole).toBe("copy");
      expect(result.contract.productionFamilyId).toBe("copy_channels");
      expect(result.contract.readiness).toBe("contract_ready");
      expect(result.contract.escalation.contractLookupCreatesOwnerWork).toBe(false);
      expect(result.contract.revision.withinAllowanceOwnerRequired).toBe(false);
    }
  });

  it("fails the intentional first email-campaign draft on substantive QA defects", () => {
    const summary = certCopyQaSummary();
    expect(summary.emailFirst.ok).toBe(false);
    const messages = summary.emailFirst.findings.map((f) => f.message).join(" | ");
    expect(messages).toMatch(/Scope exceeded|three emails|limit 2/i);
    expect(messages).toMatch(
      /energy|CTA|corporate|AI-sounding|offer price|offer window|same-day/i,
    );
    expect(emailCampaignFirstDraft.knownDefects.length).toBeGreaterThanOrEqual(4);
  });

  it("passes corrected email campaign and other copy deliverables under contract checks", () => {
    const summary = certCopyQaSummary();
    expect(summary.emailCorrected.ok).toBe(true);
    expect(summary.marketingCopy.ok).toBe(true);
    expect(summary.emailKit.ok).toBe(true);
    expect(summary.smsKit.ok).toBe(true);
    expect(summary.marketingCopyWordCount).toBeLessThanOrEqual(750);
    expect(marketingCopyTotalWords()).toBe(summary.marketingCopyWordCount);
    expect(emailCampaignCorrectedDraft.emails).toHaveLength(2);
  });

  it("routes substantive QA failure to producer correction without owner escalation", () => {
    // Non-copy_channels social task — proves ordinary correction path still works.
    // Runtime copy_channels gate is covered in copy-quality/copy-quality.test.ts.
    const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, copyStaff, now);
    const kitchenContext = {
      campaign,
      materials: [] as const,
      assignments,
      production: kitchenCopyFixture.production,
    };

    const readyCopy = copyReadyTask();
    const failNotes = [
      "CERT COPY substantive fail:",
      ...emailCampaignFirstDraft.knownDefects,
    ].join(" ");

    const fail = applyQaFail(
      tasksEnvelope([readyCopy]),
      {
        action: "qa_fail",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
        notes: failNotes,
      },
      qaStaff,
      kitchenContext,
    );
    expect(fail.ok).toBe(true);
    if (!fail.ok) return;

    const needsRevision = fail.envelope.tasks.find((t) => t.id === readyCopy.id);
    expect(needsRevision?.workflowState).toBe("needs_revision");
    expect(fail.envelope.qaRecords?.[0]?.action).toBe("qa_fail");
    expect(fail.envelope.qaRecords?.[0]?.category).toBe("production_correction");
    expect(fail.envelope.qaRecords?.[0]?.notes).toMatch(/cut energy bills in half/i);

    expect(ownerEscalationForRoutineOperationalEvent()).toBe("owner_not_required");

    const ledgerAfterFail = projectKitchenCommsLedger({
      campaignId: "campaign-1",
      tasksEnvelope: fail.envelope,
    });
    const qaFailEvents = [...ledgerAfterFail.active, ...ledgerAfterFail.history].filter(
      (e) => e.category === "qa",
    );
    expect(qaFailEvents.length).toBeGreaterThan(0);
    for (const event of qaFailEvents) {
      expect(event.ownerEscalation).toBe("owner_not_required");
      expect(event.actionKind).toBe("role_action");
    }
    // Ordinary production_correction must not create owner_decision QA events.
    expect(
      qaFailEvents.filter((e) => e.actionKind === "owner_decision"),
    ).toHaveLength(0);

    const reclaim = applyClaim(
      fail.envelope,
      {
        action: "claim",
        taskId: readyCopy.id,
        from: "needs_revision",
        claimVersion: null,
      },
      copyStaff,
      kitchenContext,
    );
    expect(reclaim.ok).toBe(true);
    if (!reclaim.ok) return;

    // After correction, copy returns to ready_for_qa for re-check.
    const correctedEnvelope: ServerTasksEnvelope = {
      ...reclaim.envelope,
      tasks: reclaim.envelope.tasks.map((task) =>
        task.id === readyCopy.id
          ? {
              ...task,
              workflowState: "ready_for_qa",
              status: "ready_for_qa",
              claimedByUserId: undefined,
              claimedByDisplayName: undefined,
              claimedAt: undefined,
            }
          : task,
      ),
    };

    const pass = applyQaPass(
      correctedEnvelope,
      {
        action: "qa_pass",
        taskId: readyCopy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("copy")],
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
        notes: "Corrected Harbor & Oak draft satisfies scope, CTA, facts, and voice.",
      },
      qaStaff,
      kitchenContext,
    );
    expect(pass.ok).toBe(true);
    if (!pass.ok) return;

    expect(pass.envelope.qaRecords?.some((r) => r.action === "qa_pass")).toBe(true);

    const ledgerAfterPass = projectKitchenCommsLedger({
      campaignId: "campaign-1",
      tasksEnvelope: pass.envelope,
    });
    const allEvents = [...ledgerAfterPass.active, ...ledgerAfterPass.history];
    const qaEvents = allEvents.filter((e) => e.category === "qa");
    expect(qaEvents.length).toBeGreaterThan(0);
    expect(qaEvents.some((e) => e.eventType === "qa_pass")).toBe(true);
    expect(
      qaEvents.filter((e) => e.ownerEscalation === "owner_required"),
    ).toHaveLength(0);

    // Owner identity present in suite but unused for this correction path.
    expect(owner.roles).toContain("owner");
  });

  it("keeps ordinary copy correction on producer/QA path in contract escalation doctrine", () => {
    for (const sku of CERT_COPY_SKUS) {
      const result = resolveServiceProductionContract(sku);
      expect(result.status).toBe("resolved");
      if (result.status !== "resolved") continue;
      expect(result.contract.escalation.producerHandles.join(" ")).toMatch(
        /Ordinary revision|production redo|Routine design or copy correction/i,
      );
      expect(result.contract.escalation.ownerHandles.join(" ")).toMatch(
        /Revision allowance exhausted|Scope change/i,
      );
    }
  });
});
