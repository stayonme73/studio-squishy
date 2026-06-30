import type { CampaignRecord } from "@/config/studio-board";
import type { StudioUser } from "@/lib/campaign-store/types";

import { applyCreateVersion, applyPinQaToVersion } from "@/lib/campaign-production/actions";
import { emptyProductionRecord, syncProductionWithPlan } from "@/lib/campaign-production/plan-sync";
import type { KitchenV1ProductionPhase, ServerProductionEnvelope } from "@/lib/campaign-production/types";
import type { CampaignTaskItem } from "@/lib/campaign-tasks/types";

const KITCHEN_PHASE_ORDER: KitchenV1ProductionPhase[] = [
  "strategy_content_direction",
  "copy",
  "creative",
];

export type KitchenStrategyFixture = {
  production: ServerProductionEnvelope;
  strategyWorkVersionId: string;
};

export type KitchenCopyFixture = {
  production: ServerProductionEnvelope;
  copyWorkVersionId: string;
};

export type KitchenCreativeFixture = {
  production: ServerProductionEnvelope;
  creativeWorkVersionId: string;
};

function kitchenTask(
  phase: KitchenV1ProductionPhase,
  overrides: Partial<CampaignTaskItem> = {},
): CampaignTaskItem {
  const base: CampaignTaskItem = {
    id: `sm-001:${phase}`,
    title: `Social — ${phase}`,
    phase,
    status: phase === "strategy_content_direction" ? "in_progress" : "ready_for_qa",
    relatedServiceIds: ["sm-001"],
    familyId: "social",
    catalogFamilyId: "social_media",
    serviceName: "Social",
    dependsOn: [],
    workflowState: phase === "strategy_content_direction" ? "in_progress" : "ready_for_qa",
    responsibleRole:
      phase === "strategy_content_direction"
        ? "strategy"
        : phase === "copy"
          ? "copy"
          : "creative_production",
  };
  return { ...base, ...overrides };
}

function syncedProduction(campaign: CampaignRecord, syncedAt: string): ServerProductionEnvelope {
  const record = syncProductionWithPlan(
    emptyProductionRecord(campaign.campaignId, "sm-001:one_time"),
    campaign,
  );
  return { ...record, syncedAt };
}

function passStage(
  production: ServerProductionEnvelope,
  phase: KitchenV1ProductionPhase,
  user: StudioUser,
  draftBody: string,
): ServerProductionEnvelope {
  const task = kitchenTask(phase);
  const created = applyCreateVersion(production, task, { body: draftBody }, user);
  if (!created.ok || !created.version) {
    throw new Error(`fixture: create version for ${phase}: ${!created.ok ? created.error : "no version"}`);
  }
  const pinned = applyPinQaToVersion(
    created.envelope,
    task,
    created.version.id,
    `fixture-qa-${phase}`,
    "qa_pass",
  );
  if (!pinned.ok) {
    throw new Error(`fixture: QA pass for ${phase}: ${pinned.error}`);
  }
  return pinned.envelope;
}

/** Production store at strategy stage with a current strategy work version. */
export function buildKitchenStrategyStageFixture(
  campaign: CampaignRecord,
  user: StudioUser,
  syncedAt: string,
): KitchenStrategyFixture {
  const strategyTask = kitchenTask("strategy_content_direction", {
    workflowState: "in_progress",
    status: "in_progress",
  });
  const strategyVersion = applyCreateVersion(
    syncedProduction(campaign, syncedAt),
    strategyTask,
    { body: "Strategy direction draft" },
    user,
  );
  if (!strategyVersion.ok || !strategyVersion.version) {
    throw new Error(
      `fixture: strategy version: ${!strategyVersion.ok ? strategyVersion.error : "no version"}`,
    );
  }

  return {
    production: strategyVersion.envelope,
    strategyWorkVersionId: strategyVersion.version.id,
  };
}

/** Production store at copy stage with a current copy work version. */
export function buildKitchenCopyStageFixture(
  campaign: CampaignRecord,
  user: StudioUser,
  syncedAt: string,
): KitchenCopyFixture {
  let production = syncedProduction(campaign, syncedAt);
  production = passStage(production, "strategy_content_direction", user, "Direction approved");

  const copyTask = kitchenTask("copy", {
    workflowState: "in_progress",
    status: "in_progress",
  });
  const copyVersion = applyCreateVersion(production, copyTask, { body: "Copy draft for QA" }, user);
  if (!copyVersion.ok || !copyVersion.version) {
    throw new Error(`fixture: copy version: ${!copyVersion.ok ? copyVersion.error : "no version"}`);
  }

  return {
    production: copyVersion.envelope,
    copyWorkVersionId: copyVersion.version.id,
  };
}

/** Production store at creative stage with a current creative work version (after copy QA pass). */
export function buildKitchenCreativeStageFixture(
  campaign: CampaignRecord,
  user: StudioUser,
  syncedAt: string,
): KitchenCreativeFixture {
  let production = syncedProduction(campaign, syncedAt);
  for (const phase of KITCHEN_PHASE_ORDER.slice(0, 2)) {
    production = passStage(production, phase, user, `${phase} draft`);
  }

  const creativeTask = kitchenTask("creative", {
    workflowState: "complete",
    status: "complete",
  });
  const creativeVersion = applyCreateVersion(
    production,
    creativeTask,
    { body: "Creative assets bundle" },
    user,
  );
  if (!creativeVersion.ok || !creativeVersion.version) {
    throw new Error(
      `fixture: creative version: ${!creativeVersion.ok ? creativeVersion.error : "no version"}`,
    );
  }

  return {
    production: creativeVersion.envelope,
    creativeWorkVersionId: creativeVersion.version.id,
  };
}
