import { describe, expect, it } from "vitest";

import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";
import type { CampaignAssignmentsFile } from "@/lib/file-room/assignments";

import { applyQaBlock, applyQaFail, applyQaPass } from "./actions";
import { applyCreateVersion } from "@/lib/campaign-production/actions";
import { emptyProductionRecord, syncProductionWithPlan } from "@/lib/campaign-production/plan-sync";
import type { ServerProductionEnvelope } from "@/lib/campaign-production/types";
import { validateOptionalQaBlockWorkVersionId } from "@/lib/campaign-production/validation";
import { requiredChecksForPhase } from "./qa-checklists";
import {
  applyFormalQaFailCascade,
  buildDeliveryPrepContext,
  routeQaFailTarget,
  SCOPE_CHANGE_REJECT_MESSAGE,
  validateQaFailCategory,
} from "./qa";
import {
  buildKitchenCopyStageFixture,
  buildKitchenCreativeStageFixture,
} from "./kitchen-test-fixtures";
import type { CampaignTaskItem, ServerTasksEnvelope } from "./types";

const now = "2026-06-29T12:00:00.000Z";

const owner: StudioUser = {
  id: "owner-1",
  email: "owner@local.dev",
  displayName: "Owner",
  roles: ["owner"],
};

const qaStaff: StudioUser = {
  id: "staff-qa",
  email: "qa@local.dev",
  displayName: "QA Staff",
  roles: ["staff"],
};

const copyStaff: StudioUser = {
  id: "staff-copy",
  email: "copy@local.dev",
  displayName: "Copy Staff",
  roles: ["staff"],
};

const assignments: CampaignAssignmentsFile = {
  staffByUserId: {
    "staff-qa": ["campaign-1"],
    "staff-copy": ["campaign-1"],
  },
  staffCapabilities: {
    "staff-qa": ["qa"],
    "staff-copy": ["copy"],
  },
};

const campaign: CampaignRecord = {
  campaignId: "campaign-1",
  campaignName: "Test",
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

function task(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
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

function envelope(tasks: CampaignTaskItem[]): ServerTasksEnvelope {
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

const context = { campaign, materials: [], assignments };

const kitchenCopyFixture = buildKitchenCopyStageFixture(campaign, copyStaff, now);
const kitchenCreativeFixture = buildKitchenCreativeStageFixture(campaign, copyStaff, now);
const kitchenContext = { ...context, production: kitchenCopyFixture.production };
const kitchenCreativeContext = { ...context, production: kitchenCreativeFixture.production };

const copyChecks = [...requiredChecksForPhase("copy")];

describe("routeQaFailTarget", () => {
  it("routes inline QA fail to the same task", () => {
    const copy = task();
    expect(routeQaFailTarget(copy, [copy])?.id).toBe(copy.id);
  });

  it("routes formal QA fail to upstream production", () => {
    const creative = task({
      id: "sm-001:creative",
      phase: "creative",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "creative_production",
    });
    const formalQa = task({
      id: "sm-001:qa",
      phase: "qa",
      dependsOn: [creative.id],
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      responsibleRole: "qa",
    });
    expect(routeQaFailTarget(formalQa, [creative, formalQa])?.id).toBe(creative.id);
  });
});

describe("applyQaPass", () => {
  it("completes ready_for_qa production and appends qa record", () => {
    const copy = task();
    const result = applyQaPass(
      envelope([copy]),
      {
        action: "qa_pass",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: copyChecks,
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      qaStaff,
      kitchenContext,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.task!.workflowState).toBe("complete");
      expect(result.envelope.qaRecords).toHaveLength(1);
      expect(result.envelope.qaRecords?.[0].action).toBe("qa_pass");
    }
  });

  it("allows owner to qa_pass", () => {
    const copy = task();
    const result = applyQaPass(
      envelope([copy]),
      {
        action: "qa_pass",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: copyChecks,
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
      },
      owner,
      kitchenContext,
    );
    expect(result.ok).toBe(true);
  });
});

describe("applyQaFail", () => {
  it("inline production_correction reopens same task to needs_revision", () => {
    const copy = task();
    const result = applyQaFail(
      envelope([copy]),
      {
        action: "qa_fail",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
        notes: "Fix headline.",
      },
      qaStaff,
      kitchenContext,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const updated = result.envelope.tasks.find((entry) => entry.id === copy.id);
      expect(updated?.workflowState).toBe("needs_revision");
      expect(result.envelope.qaRecords?.[0].routedTaskId).toBe(copy.id);
    }
  });

  it("formal QA fail cascades upstream needs_revision and resets qa/delivery_prep", () => {
    const direction = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "strategy",
      dependsOn: [],
    });
    const creative = task({
      id: "sm-001:creative",
      phase: "creative",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "creative_production",
      dependsOn: [direction.id],
    });
    const formalQa = task({
      id: "sm-001:qa",
      phase: "qa",
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      responsibleRole: "qa",
      dependsOn: [creative.id],
    });
    const deliveryPrep = task({
      id: "sm-001:delivery_prep",
      phase: "delivery_prep",
      workflowState: "unstarted",
      status: "not_ready",
      responsibleRole: "producer_dispatcher",
      dependsOn: [formalQa.id],
    });

    const result = applyQaFail(
      envelope([direction, creative, formalQa, deliveryPrep]),
      {
        action: "qa_fail",
        taskId: formalQa.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
        workVersionId: kitchenCreativeFixture.creativeWorkVersionId,
      },
      qaStaff,
      kitchenCreativeContext,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.tasks.find((entry) => entry.id === creative.id)?.workflowState).toBe(
        "needs_revision",
      );
      expect(result.envelope.tasks.find((entry) => entry.id === formalQa.id)?.workflowState).toBe(
        "unstarted",
      );
      expect(
        result.envelope.tasks.find((entry) => entry.id === deliveryPrep.id)?.workflowState,
      ).toBe("unstarted");
    }
  });

  it("missing_client_fact blocks routed task only", () => {
    const copy = task();
    const creative = task({
      id: "sm-001:creative",
      phase: "creative",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "creative_production",
    });
    const result = applyQaFail(
      envelope([copy, creative]),
      {
        action: "qa_fail",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "missing_client_fact",
        workVersionId: kitchenCopyFixture.copyWorkVersionId,
        missingFactDescription: "Brand hex codes",
        missingFactReason: "Cannot verify palette without client values.",
      },
      qaStaff,
      kitchenContext,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.tasks.find((entry) => entry.id === copy.id)?.workflowState).toBe(
        "blocked",
      );
      expect(result.envelope.tasks.find((entry) => entry.id === creative.id)?.workflowState).toBe(
        "complete",
      );
    }
  });

  it("rejects scope_change with no state change", () => {
    const copy = task();
    const before = envelope([copy]);
    const result = applyQaFail(
      before,
      {
        action: "qa_fail",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "scope_change",
      },
      qaStaff,
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.error).toBe(SCOPE_CHANGE_REJECT_MESSAGE);
    }
  });
});

describe("applyQaBlock", () => {
  it("blocks task and prevents subsequent qa_pass", () => {
    const copy = task();
    const blocked = applyQaBlock(
      envelope([copy]),
      {
        action: "qa_block",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
      },
      qaStaff,
      context,
    );
    expect(blocked.ok).toBe(true);
    if (!blocked.ok) return;

    const passAttempt = applyQaPass(
      blocked.envelope,
      {
        action: "qa_pass",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: copyChecks,
      },
      qaStaff,
      context,
    );
    expect(passAttempt.ok).toBe(false);
  });

  it("allows qa_block without workVersionId for pre-version compliance blocks", () => {
    const copy = task();
    const result = applyQaBlock(
      envelope([copy]),
      {
        action: "qa_block",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
        notes: "Missing client disclosure before reviewable draft",
      },
      qaStaff,
      context,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.qaRecords?.[0]?.workVersionId).toBeUndefined();
  });

  it("preserves workVersionId on qa_block when provided and valid", () => {
    const strategy = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      title: "Social — Content direction",
      responsibleRole: "strategy",
      dependsOn: [],
    });
    const productionRecord = syncProductionWithPlan(
      emptyProductionRecord("campaign-1", "sm-001:one_time"),
      campaign,
    );
    let production: ServerProductionEnvelope = { ...productionRecord, syncedAt: now };
    const created = applyCreateVersion(production, strategy, { body: "Direction draft v1" }, copyStaff);
    if (!created.ok || !created.version) throw new Error(`setup failed: ${!created.ok ? created.error : "no version"}`);
    production = created.envelope;

    const result = applyQaBlock(
      envelope([strategy]),
      {
        action: "qa_block",
        taskId: strategy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "compliance_concern",
        workVersionId: created.version.id,
      },
      qaStaff,
      { ...context, production },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.envelope.qaRecords?.[0]?.workVersionId).toBe(created.version.id);
    expect(production.versions[0]?.qaPin).toBeUndefined();
  });

  it("rejects invalid workVersionId on qa_block without clearing production pins", () => {
    const copy = task();
    const productionRecord = syncProductionWithPlan(
      emptyProductionRecord("campaign-1", "sm-001:one_time"),
      campaign,
    );
    const production: ServerProductionEnvelope = { ...productionRecord, syncedAt: now };

    const result = applyQaBlock(
      envelope([copy]),
      {
        action: "qa_block",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "direction_disagreement",
        workVersionId: "nonexistent-version",
      },
      qaStaff,
      { ...context, production },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
    expect(result.error).toBe("workVersionId not found.");
  });
});

describe("validateOptionalQaBlockWorkVersionId", () => {
  function kitchenProduction(): ServerProductionEnvelope {
    const record = syncProductionWithPlan(
      emptyProductionRecord("campaign-1", "sm-001:one_time"),
      campaign,
    );
    return { ...record, syncedAt: now };
  }

  it("allows missing workVersionId for kitchen tasks", () => {
    const copy = task();
    const result = validateOptionalQaBlockWorkVersionId(kitchenProduction(), copy, undefined);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workVersionId).toBeUndefined();
  });

  it("accepts non-current version without current-version requirement", () => {
    const strategy = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      title: "Social — Content direction",
      responsibleRole: "strategy",
      dependsOn: [],
    });
    let production = kitchenProduction();
    const first = applyCreateVersion(production, strategy, { body: "V1" }, copyStaff);
    if (!first.ok || !first.version) throw new Error(`setup failed: ${!first.ok ? first.error : "no version"}`);
    production = first.envelope;
    const second = applyCreateVersion(production, strategy, { body: "V2" }, copyStaff);
    if (!second.ok || !second.version) throw new Error(`setup failed: ${!second.ok ? second.error : "no version"}`);

    const result = validateOptionalQaBlockWorkVersionId(
      second.envelope,
      strategy,
      first.version.id,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.workVersionId).toBe(first.version.id);
  });
});

describe("validateQaFailCategory", () => {
  it("rejects scope_change", () => {
    const result = validateQaFailCategory("scope_change");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(SCOPE_CHANGE_REJECT_MESSAGE);
    }
  });
});

describe("applyFormalQaFailCascade", () => {
  it("resets formal qa and delivery prep to unstarted", () => {
    const formalQa = task({
      id: "sm-001:qa",
      phase: "qa",
      dependsOn: ["sm-001:creative"],
    });
    const deliveryPrep = task({
      id: "sm-001:delivery_prep",
      phase: "delivery_prep",
      dependsOn: [formalQa.id],
      workflowState: "ready_for_qa",
    });
    const cascade = applyFormalQaFailCascade([formalQa, deliveryPrep], formalQa);
    expect(cascade.resetTaskIds).toEqual(["sm-001:qa", "sm-001:delivery_prep"]);
    expect(cascade.tasks.find((entry) => entry.id === formalQa.id)?.workflowState).toBe(
      "unstarted",
    );
  });
});

describe("buildDeliveryPrepContext", () => {
  it("flags unresolved compliance blockers", () => {
    const blocked = task({
      workflowState: "blocked",
      workflowBlockedReason: "compliance_hold",
    });
    const ctx = buildDeliveryPrepContext(campaign, {
      campaignId: "campaign-1",
      tasks: [blocked],
      planFingerprint: "sm-001:one_time",
      updatedAt: now,
      version: 4,
    });
    expect(ctx.hasUnresolvedBlocker).toBe(true);
  });
});

describe("applyQaPass delivery prep gates", () => {
  it("denies delivery prep without upstream formal QA complete", () => {
    const creative = task({
      id: "sm-001:creative",
      phase: "creative",
      workflowState: "complete",
      status: "complete",
      responsibleRole: "creative_production",
      dependsOn: [],
    });
    const formalQa = task({
      id: "sm-001:qa",
      phase: "qa",
      workflowState: "in_progress",
      status: "in_progress",
      responsibleRole: "qa",
      dependsOn: [creative.id],
    });
    const deliveryPrep = task({
      id: "sm-001:delivery_prep",
      phase: "delivery_prep",
      workflowState: "ready_for_qa",
      status: "ready_for_qa",
      responsibleRole: "producer_dispatcher",
      dependsOn: [formalQa.id],
    });

    const result = applyQaPass(
      envelope([creative, formalQa, deliveryPrep]),
      {
        action: "qa_pass",
        taskId: deliveryPrep.id,
        from: "ready_for_qa",
        claimVersion: null,
        checks: [...requiredChecksForPhase("delivery_prep")],
      },
      qaStaff,
      context,
    );
    expect(result.ok).toBe(false);
  });
});

describe("applyQaFail authorization", () => {
  it("forbids non-QA staff", () => {
    const copy = task();
    const result = applyQaFail(
      envelope([copy]),
      {
        action: "qa_fail",
        taskId: copy.id,
        from: "ready_for_qa",
        claimVersion: null,
        category: "production_correction",
      },
      copyStaff,
      context,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });
});
