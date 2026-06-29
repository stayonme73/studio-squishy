import { describe, expect, it } from "vitest";

import { resolveResponsibleRole } from "./roles";
import { buildReadinessContext } from "./readiness";
import {
  applyEffectiveStatus,
  mapWorkflowToEffectiveStatus,
  resolveEffectiveTaskStatus,
} from "./workflow";
import type { CampaignTaskItem } from "./types";

function task(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "sm-001:copy",
    title: "Social — Copy",
    phase: "copy",
    status: "not_ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: ["sm-001:strategy_content_direction"],
    workflowState: "unstarted",
    responsibleRole: "copy",
    ...overrides,
  };
}

const readyContext = buildReadinessContext({
  approvedStudioPlan: { lineItems: [{}] },
  selectedCampaignOption: "Option A",
  projectDetailsSubmittedAt: "2026-01-01",
});

describe("resolveEffectiveTaskStatus", () => {
  it("returns not_ready when upstream QA is not complete", () => {
    const upstream = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      dependsOn: [],
      workflowState: "in_progress",
      responsibleRole: "strategy",
    });
    const downstream = task();
    const result = resolveEffectiveTaskStatus(downstream, readyContext, [upstream, downstream]);
    expect(result.status).toBe("not_ready");
  });

  it("returns ready when upstream complete and campaign gates pass", () => {
    const upstream = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      dependsOn: [],
      workflowState: "complete",
      responsibleRole: "strategy",
    });
    const downstream = task();
    const result = resolveEffectiveTaskStatus(downstream, readyContext, [upstream, downstream]);
    expect(result.status).toBe("ready");
  });

  it("returns blocked when material block applies over eligible workflow", () => {
    const socialTask = task({
      id: "sm-001:copy",
      dependsOn: [],
      workflowState: "unstarted",
    });
    const result = resolveEffectiveTaskStatus(
      socialTask,
      readyContext,
      [socialTask],
      { readiness: "material_blocked", blockedReason: "Waiting on logo" },
    );
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toMatch(/logo/i);
  });

  it("returns in_progress when workflow started even if readiness would be ready", () => {
    const active = task({ dependsOn: [], workflowState: "in_progress" });
    const result = resolveEffectiveTaskStatus(active, readyContext, [active]);
    expect(result.status).toBe("in_progress");
  });

  it("preserves complete terminal — never downgrades to not_ready", () => {
    const complete = task({
      dependsOn: ["missing-upstream"],
      workflowState: "complete",
    });
    const gatedContext = buildReadinessContext({});
    const result = resolveEffectiveTaskStatus(complete, gatedContext, [complete]);
    expect(result.status).toBe("complete");
  });

  it("preserves cancelled terminal", () => {
    const cancelled = task({ workflowState: "cancelled", dependsOn: [] });
    const result = resolveEffectiveTaskStatus(cancelled, readyContext, [cancelled]);
    expect(result.status).toBe("cancelled");
  });

  it("returns blocked for workflowState blocked with workflowBlockedReason", () => {
    const blocked = task({
      dependsOn: [],
      workflowState: "blocked",
      workflowBlockedReason: "QA compliance hold",
    });
    const result = resolveEffectiveTaskStatus(blocked, readyContext, [blocked]);
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe("QA compliance hold");
  });

  it("returns blocked when upstream is cancelled", () => {
    const upstream = task({
      id: "sm-001:strategy_content_direction",
      phase: "strategy_content_direction",
      dependsOn: [],
      workflowState: "cancelled",
      responsibleRole: "strategy",
    });
    const downstream = task();
    const result = resolveEffectiveTaskStatus(downstream, readyContext, [upstream, downstream]);
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toMatch(/upstream task cancelled/i);
  });
});

describe("mapWorkflowToEffectiveStatus", () => {
  it("maps active workflow states", () => {
    expect(mapWorkflowToEffectiveStatus("ready_for_qa")).toBe("ready_for_qa");
    expect(mapWorkflowToEffectiveStatus("needs_revision")).toBe("needs_revision");
  });
});

describe("applyEffectiveStatus", () => {
  it("writes effective status onto task", () => {
    const item = task({ dependsOn: [], workflowState: "unstarted" });
    const updated = applyEffectiveStatus(item, readyContext, [item]);
    expect(updated.status).toBe("ready");
  });
});

describe("resolveResponsibleRole", () => {
  it("maps strategy phases to strategy role", () => {
    expect(
      resolveResponsibleRole(
        task({ phase: "strategy_content_direction", responsibleRole: undefined }),
      ),
    ).toBe("strategy");
  });

  it("maps copy phase to copy role", () => {
    expect(resolveResponsibleRole(task({ phase: "copy", responsibleRole: undefined }))).toBe(
      "copy",
    );
  });

  it("maps creative phases to creative_production role", () => {
    expect(
      resolveResponsibleRole(task({ phase: "creative", responsibleRole: undefined })),
    ).toBe("creative_production");
  });

  it("maps qa phase to qa role", () => {
    expect(resolveResponsibleRole(task({ phase: "qa", responsibleRole: undefined }))).toBe("qa");
  });

  it("maps delivery_prep and campaign-level tasks to producer_dispatcher", () => {
    expect(
      resolveResponsibleRole(
        task({ phase: "delivery_prep", id: "sm-001:delivery_prep", responsibleRole: undefined }),
      ),
    ).toBe("producer_dispatcher");
    expect(
      resolveResponsibleRole(
        task({
          id: "campaign:producer-kickoff",
          phase: "strategy",
          dependsOn: [],
          responsibleRole: undefined,
        }),
      ),
    ).toBe("producer_dispatcher");
  });
});
