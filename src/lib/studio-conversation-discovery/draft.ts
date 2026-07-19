/**
 * Discovery ↔ working draft read/write with attribution.
 */

import { saveDiscoveryAnswers } from "@/lib/business-discovery-session";
import type { DiscoveryAnswers } from "@/lib/business-discovery-session";
import {
  discoveryTabletStepConfig,
  formatDiscoveryStepSummary,
  isDiscoveryFormTileId,
} from "@/lib/studio-conversation-discovery/steps";
import type {
  DiscoveryAnswerActor,
  DiscoveryDeadlineInformation,
  DiscoveryMaterialsStatus,
  DiscoveryTabletStepId,
} from "@/lib/studio-conversation-discovery/types";
import {
  ensureWorkingDraft,
  patchWorkingDraftSlice,
  updateWorkingDraftCursor,
  type WorkingDraftRecord,
  type WorkingDraftStorage,
  type WriteWorkingDraftResult,
} from "@/lib/studio-working-draft";
import { parseMultiselect } from "@/lib/business-discovery-completion";
import { discoveryTileConfig } from "@/config/business-discovery-studio";

export function readDiscoveryAnswersFromDraft(
  draft: WorkingDraftRecord,
): DiscoveryAnswers {
  const slice = draft.slices.discoveryAnswers;
  if (typeof slice !== "object" || slice === null) return {};
  const record = slice as Record<string, unknown>;
  /* Q1 live-wire shape: { q1, tiles } — tile map lives under tiles. */
  if (record.q1 || record.tiles) {
    const tiles = record.tiles;
    if (typeof tiles === "object" && tiles !== null) {
      return tiles as DiscoveryAnswers;
    }
    return {};
  }
  return slice as DiscoveryAnswers;
}

export function readDeadlineFromDraft(
  draft: WorkingDraftRecord,
): DiscoveryDeadlineInformation | null {
  const slice = draft.slices.deadlineInformation;
  if (typeof slice !== "object" || slice === null) return null;
  const answer = (slice as DiscoveryDeadlineInformation).answer;
  if (typeof answer !== "string" || !answer.trim()) return null;
  return { answer: answer.trim() };
}

export function readMaterialsFromDraft(
  draft: WorkingDraftRecord,
): DiscoveryMaterialsStatus | null {
  const slice = draft.slices.materialsStatus;
  if (typeof slice !== "object" || slice === null) return null;
  return slice as DiscoveryMaterialsStatus;
}

function materialsFromChannels(answers: DiscoveryAnswers): DiscoveryMaterialsStatus {
  const options = discoveryTileConfig["your-current-tools"].options ?? [];
  const channels = parseMultiselect(answers["your-current-tools"] ?? "", options);
  return {
    channelAnswers: channels,
    summary:
      channels.length > 0
        ? channels.join(", ")
        : "No marketing channels recorded yet.",
  };
}

function actorVerb(actor: DiscoveryAnswerActor): string {
  if (actor === "customer") return "Customer answered";
  if (actor === "voice") return "Voice entered";
  return "System recorded";
}

export function recordDiscoveryStepAnswer(params: {
  draft: WorkingDraftRecord;
  stepId: DiscoveryTabletStepId;
  value: string;
  actor: DiscoveryAnswerActor;
  storage?: WorkingDraftStorage | null;
}): WriteWorkingDraftResult {
  const { draft, stepId, value, actor, storage } = params;
  const config = discoveryTabletStepConfig[stepId];
  const trimmed = value.trim();

  let nextDraft = draft;
  let result: WriteWorkingDraftResult;

  if (stepId === "project-deadline") {
    const deadline: DiscoveryDeadlineInformation = { answer: trimmed };
    result = patchWorkingDraftSlice(
      nextDraft,
      "deadlineInformation",
      deadline,
      {
        actor,
        summary: `${actorVerb(actor)} ${config.title}: ${trimmed}`,
        actionCode: `discovery.${stepId}`,
      },
      storage,
    );
  } else if (isDiscoveryFormTileId(stepId)) {
    const answers = {
      ...readDiscoveryAnswersFromDraft(nextDraft),
      [stepId]: trimmed,
    };
    /* Drop empty optional answers. */
    if (!trimmed && !config.required) {
      delete answers[stepId];
    }

    result = patchWorkingDraftSlice(
      nextDraft,
      "discoveryAnswers",
      answers,
      {
        actor,
        summary: `${actorVerb(actor)} ${config.title}: ${formatDiscoveryStepSummary(stepId, answers) || "(cleared)"}`,
        actionCode: `discovery.${stepId}`,
      },
      storage,
    );

    if (result.ok && stepId === "your-current-tools") {
      const materials = materialsFromChannels(answers);
      result = patchWorkingDraftSlice(
        result.draft,
        "materialsStatus",
        materials,
        undefined,
        storage,
      );
    }

    /* Bridge: keep legacy Discovery session key in sync during migration. */
    if (result.ok) {
      saveDiscoveryAnswers(readDiscoveryAnswersFromDraft(result.draft));
    }
  } else {
    return { ok: false, reason: "not_editable" };
  }

  if (!result.ok) return result;

  return updateWorkingDraftCursor(
    result.draft,
    {
      conversationLocation: `discovery:${stepId}`,
      journeyPhase: "conversation",
      flowStep: stepId === "project-deadline" ? "deadline-check" : "understanding",
    },
    storage,
  );
}

export function bootDiscoveryWorkingDraft(
  storage?: WorkingDraftStorage | null,
): WorkingDraftRecord {
  return ensureWorkingDraft(storage);
}
