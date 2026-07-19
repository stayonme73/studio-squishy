/**
 * Write Conversation Room project facts into the single working draft.
 */

import type { ConversationRoomStage } from "@/config/conversation-room-stage-v1";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import type { GuideCaptureDraftV1 } from "@/lib/studio-guide-capture";
import {
  ensureWorkingDraft,
  patchWorkingDraftSlice,
  writeWorkingDraft,
  type WorkingDraftRecord,
  type WriteWorkingDraftResult,
} from "@/lib/studio-working-draft";
import {
  readOpeningAnswers,
  readSelectedServices,
  type OpeningAnswersSlice,
  type SelectedServiceSlice,
  withConversationStage,
} from "@/lib/conversation-room-draft/slices";

function okDraft(
  result: WriteWorkingDraftResult,
  fallback: WorkingDraftRecord,
): WorkingDraftRecord {
  return result.ok ? result.draft : fallback;
}

export function openingFromGuideDraft(
  guide: GuideCaptureDraftV1,
): OpeningAnswersSlice {
  return {
    preferredName: guide.preferredName,
    projectNeed: guide.projectNeed,
    businessName: guide.businessName,
    requestedDeadline: guide.requestedDeadline,
    deadlineStatus: guide.deadlineStatus,
    existingMaterialsNote: guide.existingMaterialsNote,
    confirmedAt: guide.confirmedAt,
  };
}

export function guideDraftFromOpening(
  opening: OpeningAnswersSlice,
): GuideCaptureDraftV1 {
  return {
    schemaVersion: 1,
    preferredName: opening.preferredName,
    projectNeed: opening.projectNeed,
    businessName: opening.businessName,
    requestedDeadline: opening.requestedDeadline,
    deadlineStatus: opening.deadlineStatus,
    existingMaterialsNote: opening.existingMaterialsNote,
    confirmedAt: opening.confirmedAt,
    source: "lobby-guide-conversation",
  };
}

/** Seed working draft when only Guide capture has a preferred name yet. */
export function bootHasOpeningSeed(guide: GuideCaptureDraftV1 | null): boolean {
  return Boolean(
    guide?.preferredName.trim() || guide?.projectNeed.trim(),
  );
}

/** Boot: ensure working draft; seed opening answers from Guide capture if empty. */
export function bootConversationProjectDraft(
  guide: GuideCaptureDraftV1 | null,
): WorkingDraftRecord {
  let draft = ensureWorkingDraft();
  const opening = readOpeningAnswers(draft);
  const hasOpening = Boolean(
    opening.preferredName.trim() || opening.projectNeed.trim(),
  );
  if (!hasOpening && bootHasOpeningSeed(guide)) {
    draft = persistOpeningAnswers(draft, openingFromGuideDraft(guide!));
  }
  return draft;
}

export function persistOpeningAnswers(
  draft: WorkingDraftRecord,
  opening: OpeningAnswersSlice,
  actor: "customer" | "voice" | "system" = "customer",
): WorkingDraftRecord {
  let next = okDraft(
    patchWorkingDraftSlice(draft, "discoveryAnswers", opening, {
      actor,
      executedBy: actor,
      summary: "Updated opening answers",
      actionCode: "opening-answers-update",
    }),
    draft,
  );
  next = okDraft(
    patchWorkingDraftSlice(
      next,
      "deadlineInformation",
      {
        requestedDeadline: opening.requestedDeadline,
        deadlineStatus: opening.deadlineStatus,
      },
      undefined,
    ),
    next,
  );
  next = okDraft(
    patchWorkingDraftSlice(
      next,
      "materialsStatus",
      { existingMaterialsNote: opening.existingMaterialsNote },
      undefined,
    ),
    next,
  );
  return next;
}

export function persistConversationStage(
  draft: WorkingDraftRecord,
  stage: ConversationRoomStage,
): WorkingDraftRecord {
  const staged = withConversationStage(draft, stage);
  return okDraft(writeWorkingDraft(staged, draft.revision), draft);
}

export function persistSelectedRoute(
  draft: WorkingDraftRecord,
  roadId: RouteMapRoadId,
  actor: "customer" | "voice" | "system" = "customer",
): WorkingDraftRecord {
  return okDraft(
    patchWorkingDraftSlice(
      draft,
      "customerSelectedRoute",
      { roadId, selectedAt: new Date().toISOString() },
      {
        actor,
        executedBy: actor,
        summary: `Selected route ${roadId}`,
        actionCode: "route-selected",
      },
    ),
    draft,
  );
}

export function persistRouteRecommendation(
  draft: WorkingDraftRecord,
  roadId: RouteMapRoadId,
  projectNeed: string,
): WorkingDraftRecord {
  return okDraft(
    patchWorkingDraftSlice(
      draft,
      "routeRecommendation",
      {
        roadId,
        projectNeed,
        recommendedAt: new Date().toISOString(),
      },
      {
        actor: "voice",
        initiatedBy: "voice",
        executedBy: "system",
        summary: `Recommended route ${roadId}`,
        actionCode: "route-recommended",
      },
    ),
    draft,
  );
}

export function persistAddService(
  draft: WorkingDraftRecord,
  jobId: RouteMapJobId,
  roadId: RouteMapRoadId,
  actor: "customer" | "voice" | "system" = "customer",
): WorkingDraftRecord {
  const current = readSelectedServices(draft);
  if (current.some((s) => s.jobId === jobId)) return draft;
  const nextServices: SelectedServiceSlice[] = [
    ...current,
    { jobId, roadId, addedAt: new Date().toISOString() },
  ];
  return okDraft(
    patchWorkingDraftSlice(draft, "selectedServices", nextServices, {
      actor,
      executedBy: actor,
      summary: `Added service ${jobId}`,
      actionCode: "service-added",
    }),
    draft,
  );
}

export function persistRemoveService(
  draft: WorkingDraftRecord,
  jobId: RouteMapJobId,
  actor: "customer" | "voice" | "system" = "customer",
): WorkingDraftRecord {
  const nextServices = readSelectedServices(draft).filter(
    (s) => s.jobId !== jobId,
  );
  return okDraft(
    patchWorkingDraftSlice(draft, "selectedServices", nextServices, {
      actor,
      executedBy: actor,
      summary: `Removed service ${jobId}`,
      actionCode: "service-removed",
    }),
    draft,
  );
}
