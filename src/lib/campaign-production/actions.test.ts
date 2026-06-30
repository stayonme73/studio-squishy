import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";

import { applyCreateVersion, applyPinQaToVersion } from "./actions";
import { deliverableKeysForKitchenPlanLine } from "./deliverable-keys";
import { syncProductionWithPlan } from "./plan-sync";
import { emptyProductionRecord } from "./plan-sync";
import type { CampaignProductionRecord, ProductionWorkUnit, ServerProductionEnvelope } from "./types";
import { validateWorkVersionIdForTask } from "./validation";

const now = "2026-06-30T12:00:00.000Z";

const staffUser = {
  id: "staff-1",
  email: "staff@local.dev",
  displayName: "Staff",
  roles: ["staff"] as const,
};

const campaign: CampaignRecord = {
  campaignId: "campaign-kitchen",
  campaignName: "Kitchen Test",
  campaignStatus: "BUILDING_CONCEPTS",
  campaignDescription: "Test",
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
        serviceName: "Social Media Launch Set",
        billingType: "one_time",
        exactPriceCents: 50000,
        priceDisplay: "$500",
        deliverables: ["Posts"],
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

function strategyTask() {
  return {
    id: "sm-001:strategy_content_direction",
    title: "Social — Content direction",
    phase: "strategy_content_direction" as const,
    status: "in_progress" as const,
    relatedServiceIds: ["sm-001"] as const,
    familyId: "social" as const,
    catalogFamilyId: "social_media" as const,
    serviceName: "Social",
    dependsOn: [] as const,
    workflowState: "in_progress" as const,
  };
}

function envelopeFromRecord(record: CampaignProductionRecord): ServerProductionEnvelope {
  return { ...record, syncedAt: now };
}

describe("deliverable-keys", () => {
  it("resolves catalog deliveryMapping keys for sm-001", () => {
    const keys = deliverableKeysForKitchenPlanLine(campaign.approvedStudioPlan!, "sm-001");
    expect(keys).toContain("static_social_post");
    expect(keys).toContain("content_calendar");
  });
});

describe("plan-sync", () => {
  it("creates one work unit per sm-001 service line", () => {
    const synced = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    expect(synced.workUnits).toHaveLength(1);
    expect(synced.workUnits[0]?.id).toBe("sm-001:production");
    expect(synced.workUnits[0]?.deliverableKeys.length).toBeGreaterThan(0);
    expect(synced.workUnits[0]?.currentTaskId).toBe("sm-001:strategy_content_direction");
  });

  it("blocks work unit on plan fingerprint mismatch without deleting versions", () => {
    const base = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    base.versions = [
      {
        id: "version-1",
        workUnitId: "sm-001:production",
        taskId: "sm-001:strategy_content_direction",
        stage: "strategy_content_direction",
        reason: "initial",
        contentKind: "plain_text",
        body: "Existing work",
        createdAt: now,
        createdByUserId: "staff-1",
        createdByDisplayName: "Staff",
      },
    ];

    const changedCampaign: CampaignRecord = {
      ...campaign,
      approvedStudioPlan: {
        ...campaign.approvedStudioPlan!,
        lineItems: [
          {
            ...campaign.approvedStudioPlan!.lineItems[0]!,
            billingType: "monthly",
          },
        ],
      },
    };

    const synced = syncProductionWithPlan(base, changedCampaign);
    const blocked = synced.workUnits.find((unit) => unit.id === "sm-001:production");
    expect(blocked?.status).toBe("blocked_plan_change");
    expect(synced.versions).toHaveLength(1);
    expect(synced.workUnits.filter((unit) => unit.serviceId === "sm-001").length).toBeGreaterThan(1);
  });
});

describe("production actions", () => {
  it("creates append-only versions with stage lineage", () => {
    const record = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    let envelope = envelopeFromRecord(record);

    const created = applyCreateVersion(envelope, strategyTask(), { body: "Direction draft" }, staffUser);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    envelope = created.envelope;
    expect(envelope.versions).toHaveLength(1);
    const unit = envelope.workUnits[0] as ProductionWorkUnit;
    const lineage = unit.stageLineage.find((entry) => entry.stage === "strategy_content_direction");
    expect(lineage?.currentVersionId).toBe(created.version?.id);
  });

  it("pins QA to exact workVersionId and advances stage on pass", () => {
    const record = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    let envelope = envelopeFromRecord(record);
    const created = applyCreateVersion(envelope, strategyTask(), { body: "Direction draft" }, staffUser);
    if (!created.ok || !created.version) throw new Error("setup failed");
    envelope = created.envelope;

    const pinned = applyPinQaToVersion(
      envelope,
      strategyTask(),
      created.version.id,
      "qa-record-1",
      "qa_pass",
    );
    expect(pinned.ok).toBe(true);
    if (!pinned.ok) return;

    const version = pinned.envelope.versions[0];
    expect(version?.qaPin?.workVersionId).toBe(created.version.id);
    expect(version?.qaPin?.qaRecordId).toBe("qa-record-1");
    expect(pinned.workUnit?.currentStage).toBe("copy");
    expect(pinned.workUnit?.currentTaskId).toBe("sm-001:copy");
  });

  it("rejects QA pin on non-current version", () => {
    const record = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    let envelope = envelopeFromRecord(record);
    const first = applyCreateVersion(envelope, strategyTask(), { body: "V1" }, staffUser);
    if (!first.ok || !first.version) throw new Error("setup failed");
    envelope = first.envelope;
    const second = applyCreateVersion(envelope, strategyTask(), { body: "V2" }, staffUser);
    if (!second.ok || !second.version) throw new Error("setup failed");

    const stalePin = applyPinQaToVersion(
      second.envelope,
      strategyTask(),
      first.version.id,
      "qa-record-2",
      "qa_pass",
    );
    expect(stalePin.ok).toBe(false);
  });
});

describe("workVersionId validation", () => {
  it("requires matching current version for kitchen tasks", () => {
    const record = syncProductionWithPlan(
      emptyProductionRecord("campaign-kitchen", "sm-001:one_time"),
      campaign,
    );
    let envelope = envelopeFromRecord(record);
    const created = applyCreateVersion(envelope, strategyTask(), { body: "Draft" }, staffUser);
    if (!created.ok || !created.version) throw new Error("setup failed");
    envelope = created.envelope;

    const valid = validateWorkVersionIdForTask(
      envelope,
      strategyTask(),
      created.version.id,
    );
    expect(valid.ok).toBe(true);

    const missing = validateWorkVersionIdForTask(envelope, strategyTask(), undefined);
    expect(missing.ok).toBe(false);
  });
});
