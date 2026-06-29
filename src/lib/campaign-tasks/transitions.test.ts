import { describe, expect, it } from "vitest";

import {
  canTransitionWorkflow,
  deliveryPrepEffectiveNotReady,
  isActiveWorkflowState,
  isTerminalWorkflowState,
  validateDeliveryPrepComplete,
} from "./transitions";
import type { CampaignTaskItem, WorkflowTransitionRequest } from "./types";

function task(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:delivery_prep",
    title: "Social — Delivery prep",
    phase: "delivery_prep",
    status: "not_ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:qa"],
    workflowState: "ready_for_qa",
    responsibleRole: "producer_dispatcher",
    ...overrides,
  };
}

function request(
  overrides: Partial<WorkflowTransitionRequest>,
): WorkflowTransitionRequest {
  return {
    taskId: "sm-001:copy",
    from: "unstarted",
    to: "in_progress",
    actorRole: "copy",
    ...overrides,
  };
}

describe("isTerminalWorkflowState", () => {
  it("complete and cancelled are terminal", () => {
    expect(isTerminalWorkflowState("complete")).toBe(true);
    expect(isTerminalWorkflowState("cancelled")).toBe(true);
  });

  it("in_progress and ready are not terminal", () => {
    expect(isTerminalWorkflowState("in_progress")).toBe(false);
    expect(isActiveWorkflowState("ready_for_qa")).toBe(true);
  });
});

describe("canTransitionWorkflow", () => {
  it("allows ready claim: unstarted → in_progress when effective ready", () => {
    const copyTask = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "unstarted",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({ taskId: copyTask.id, from: "unstarted", to: "in_progress" }),
      copyTask,
      { effectiveStatusReady: true },
    );
    expect(result.ok).toBe(true);
  });

  it("rejects unstarted → in_progress when effective not_ready", () => {
    const copyTask = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "unstarted",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({ taskId: copyTask.id, from: "unstarted", to: "in_progress" }),
      copyTask,
      { effectiveStatusReady: false },
    );
    expect(result.ok).toBe(false);
  });

  it("allows in_progress → ready_for_qa", () => {
    const active = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "in_progress",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: active.id,
        from: "in_progress",
        to: "ready_for_qa",
        actorRole: "copy",
      }),
      active,
    );
    expect(result.ok).toBe(true);
  });

  it("allows QA approve: ready_for_qa → complete for non-delivery_prep", () => {
    const qaReady = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "ready_for_qa",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: qaReady.id,
        from: "ready_for_qa",
        to: "complete",
        actorRole: "qa",
        qaDisposition: "approve_next_stage",
      }),
      qaReady,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects non-QA actor on ready_for_qa → complete", () => {
    const qaReady = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "ready_for_qa",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: qaReady.id,
        from: "ready_for_qa",
        to: "complete",
        actorRole: "copy",
        qaDisposition: "approve_next_stage",
      }),
      qaReady,
    );
    expect(result.ok).toBe(false);
  });

  it("allows QA return: ready_for_qa → needs_revision", () => {
    const qaReady = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "ready_for_qa",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: qaReady.id,
        from: "ready_for_qa",
        to: "needs_revision",
        actorRole: "qa",
        qaDisposition: "return_failed_check",
      }),
      qaReady,
    );
    expect(result.ok).toBe(true);
  });

  it("allows QA block: ready_for_qa → blocked", () => {
    const qaReady = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "ready_for_qa",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: qaReady.id,
        from: "ready_for_qa",
        to: "blocked",
        actorRole: "qa",
        qaDisposition: "mark_blocked",
      }),
      qaReady,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects QA transition that implies scope expansion", () => {
    const qaReady = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "ready_for_qa",
      workflowBlockedReason: "scope_expansion requested",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: qaReady.id,
        from: "ready_for_qa",
        to: "complete",
        actorRole: "qa",
        qaDisposition: "approve_next_stage",
      }),
      qaReady,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects complete → in_progress (must spawn revision task)", () => {
    const complete = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "complete",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: complete.id,
        from: "complete",
        to: "in_progress",
        actorRole: "copy",
      }),
      complete,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects complete → needs_revision", () => {
    const complete = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "complete",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: complete.id,
        from: "complete",
        to: "needs_revision",
        actorRole: "qa",
        qaDisposition: "return_failed_check",
      }),
      complete,
    );
    expect(result.ok).toBe(false);
  });

  it("allows in_progress → unstarted for release_claim", () => {
    const active = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "in_progress",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: active.id,
        from: "in_progress",
        to: "unstarted",
        actorRole: "copy",
      }),
      active,
    );
    expect(result.ok).toBe(true);
  });

  it("allows owner plan-change cancel: in_progress → cancelled", () => {
    const active = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "in_progress",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: active.id,
        from: "in_progress",
        to: "cancelled",
        actorRole: "owner",
      }),
      active,
    );
    expect(result.ok).toBe(true);
  });

  it("rejects cancelled → any", () => {
    const cancelled = task({
      id: "sm-001:copy",
      phase: "copy",
      workflowState: "cancelled",
      dependsOn: [],
    });
    const result = canTransitionWorkflow(
      request({
        taskId: cancelled.id,
        from: "cancelled",
        to: "in_progress",
        actorRole: "owner",
      }),
      cancelled,
    );
    expect(result.ok).toBe(false);
  });
});

describe("validateDeliveryPrepComplete", () => {
  const qaComplete = task({
    id: "sm-001:qa",
    phase: "qa",
    workflowState: "complete",
    dependsOn: ["sm-001:creative"],
  });
  const prep = task({
    dependsOn: [qaComplete.id],
    workflowState: "ready_for_qa",
  });

  const validContext = {
    hasApprovedPlan: true,
    planFingerprint: "fp-1",
    expectedPlanFingerprint: "fp-1",
    directionApproved: true,
    hasUnresolvedBlocker: false,
  };

  it("fails when upstream qa not complete", () => {
    const qaInProgress = { ...qaComplete, workflowState: "in_progress" as const };
    const result = validateDeliveryPrepComplete(prep, [qaInProgress, prep], validContext);
    expect(result.ok).toBe(false);
  });

  it("fails when plan fingerprint mismatch", () => {
    const result = validateDeliveryPrepComplete(prep, [qaComplete, prep], {
      ...validContext,
      expectedPlanFingerprint: "fp-2",
    });
    expect(result.ok).toBe(false);
  });

  it("fails when direction not approved", () => {
    const result = validateDeliveryPrepComplete(prep, [qaComplete, prep], {
      ...validContext,
      directionApproved: false,
    });
    expect(result.ok).toBe(false);
  });

  it("passes when qa complete and checklist context satisfied", () => {
    const result = validateDeliveryPrepComplete(prep, [qaComplete, prep], validContext);
    expect(result.ok).toBe(true);
  });
});

describe("delivery-prep gate sequencing", () => {
  it("delivery_prep effective not_ready until qa complete", () => {
    const qa = task({
      id: "sm-001:qa",
      phase: "qa",
      workflowState: "in_progress",
      dependsOn: [],
    });
    const prep = task({ dependsOn: [qa.id] });
    expect(deliveryPrepEffectiveNotReady(prep, [qa, prep])).toBe(true);
  });

  it("delivery_prep cannot validate complete while qa merely in_progress", () => {
    const qa = task({
      id: "sm-001:qa",
      phase: "qa",
      workflowState: "in_progress",
      dependsOn: [],
    });
    const prep = task({ dependsOn: [qa.id], workflowState: "ready_for_qa" });
    const result = validateDeliveryPrepComplete(prep, [qa, prep], {
      hasApprovedPlan: true,
      planFingerprint: "fp",
      expectedPlanFingerprint: "fp",
      directionApproved: true,
      hasUnresolvedBlocker: false,
    });
    expect(result.ok).toBe(false);
  });
});
