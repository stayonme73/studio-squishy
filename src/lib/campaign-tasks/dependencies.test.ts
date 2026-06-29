import { describe, expect, it } from "vitest";

import {
  UPSTREAM_CANCELLED_BLOCK_REASON,
  areUpstreamDependenciesSatisfied,
  upstreamDependenciesPending,
} from "./dependencies";
import { resolveEffectiveTaskStatus } from "./workflow";
import { buildReadinessContext } from "./readiness";
import type { CampaignTaskItem } from "./types";

function task(overrides: Partial<CampaignTaskItem> = {}): CampaignTaskItem {
  return {
    id: "task",
    title: "Task",
    phase: "copy",
    status: "not_ready",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: "unstarted",
    ...overrides,
  };
}

describe("areUpstreamDependenciesSatisfied", () => {
  it("empty dependsOn → satisfied", () => {
    const tasks = [task()];
    const byId = new Map(tasks.map((item) => [item.id, item]));
    expect(areUpstreamDependenciesSatisfied(task(), byId)).toBe(true);
  });

  it("single upstream complete → satisfied", () => {
    const upstream = task({ id: "upstream", workflowState: "complete" });
    const downstream = task({ id: "downstream", dependsOn: ["upstream"] });
    const byId = new Map([
      [upstream.id, upstream],
      [downstream.id, downstream],
    ]);
    expect(areUpstreamDependenciesSatisfied(downstream, byId)).toBe(true);
  });

  it("single upstream in_progress → not satisfied", () => {
    const upstream = task({ id: "upstream", workflowState: "in_progress" });
    const downstream = task({ id: "downstream", dependsOn: ["upstream"] });
    const byId = new Map([
      [upstream.id, upstream],
      [downstream.id, downstream],
    ]);
    expect(areUpstreamDependenciesSatisfied(downstream, byId)).toBe(false);
  });

  it("multi-upstream (final-package-assembly) requires all delivery_prep complete", () => {
    const prepA = task({
      id: "bf-001:delivery_prep",
      phase: "delivery_prep",
      workflowState: "complete",
    });
    const prepB = task({
      id: "sm-001:delivery_prep",
      phase: "delivery_prep",
      workflowState: "in_progress",
    });
    const assembly = task({
      id: "campaign:final-package-assembly",
      phase: "delivery_prep",
      dependsOn: [prepA.id, prepB.id],
    });
    const tasks = [prepA, prepB, assembly];
    expect(upstreamDependenciesPending(assembly, tasks)).toBe(true);

    const prepBComplete = { ...prepB, workflowState: "complete" as const };
    const tasksReady = [prepA, prepBComplete, assembly];
    expect(upstreamDependenciesPending(assembly, tasksReady)).toBe(false);
  });

  it("missing upstream id → not satisfied", () => {
    const downstream = task({ dependsOn: ["missing"] });
    const byId = new Map([[downstream.id, downstream]]);
    expect(areUpstreamDependenciesSatisfied(downstream, byId)).toBe(false);
  });

  it("cancelled upstream → not satisfied", () => {
    const upstream = task({ id: "upstream", workflowState: "cancelled" });
    const downstream = task({ id: "downstream", dependsOn: ["upstream"] });
    const byId = new Map([
      [upstream.id, upstream],
      [downstream.id, downstream],
    ]);
    expect(areUpstreamDependenciesSatisfied(downstream, byId)).toBe(false);
  });
});

describe("upstreamDependenciesPending", () => {
  it("delegates to satisfaction check across task graph", () => {
    const upstream = task({ id: "upstream", workflowState: "complete" });
    const downstream = task({ id: "downstream", dependsOn: ["upstream"] });
    expect(upstreamDependenciesPending(downstream, [upstream, downstream])).toBe(false);
  });
});

describe("downstream impact of cancelled upstream", () => {
  const readyContext = buildReadinessContext({
    approvedStudioPlan: { lineItems: [{}] },
    selectedCampaignOption: "Option A",
    projectDetailsSubmittedAt: "2026-01-01",
  });

  it("downstream unstarted task becomes blocked when upstream cancelled", () => {
    const upstream = task({
      id: "upstream",
      workflowState: "cancelled",
    });
    const downstream = task({
      id: "downstream",
      dependsOn: ["upstream"],
      workflowState: "unstarted",
    });
    const result = resolveEffectiveTaskStatus(downstream, readyContext, [upstream, downstream]);
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe(UPSTREAM_CANCELLED_BLOCK_REASON);
  });

  it("downstream active task effective status becomes blocked", () => {
    const upstream = task({
      id: "upstream",
      workflowState: "cancelled",
    });
    const downstream = task({
      id: "downstream",
      dependsOn: ["upstream"],
      workflowState: "in_progress",
    });
    const result = resolveEffectiveTaskStatus(downstream, readyContext, [upstream, downstream]);
    expect(result.status).toBe("blocked");
    expect(result.blockedReason).toBe(UPSTREAM_CANCELLED_BLOCK_REASON);
  });
});
