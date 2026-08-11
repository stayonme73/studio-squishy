/**
 * Conversation Room project slices on the unified working draft.
 * Opening answers, route, and services grow one draft — no parallel stores.
 */

import type { GuideDeadlineStatus } from "@/lib/studio-guide-capture";
import type { RouteMapJobId, RouteMapRoadId } from "@/config/route-map-v1";
import type { ConversationRoomStage } from "@/config/conversation-room-stage-v1";
import {
  stageFromLocation,
  stageLocation,
} from "@/config/conversation-room-stage-v1";
import type { WorkingDraftRecord } from "@/lib/studio-working-draft";

export type OpeningAnswersSlice = {
  preferredName: string;
  projectNeed: string;
  businessName: string;
  requestedDeadline: string;
  deadlineStatus: GuideDeadlineStatus;
  existingMaterialsNote: string;
  confirmedAt: string | null;
};

export type SelectedRouteSlice = {
  roadId: RouteMapRoadId;
  selectedAt: string;
};

/** Voice recommendation — not a customer commitment until customerSelectedRoute is set. */
export type RouteRecommendationSlice = {
  roadId: RouteMapRoadId;
  projectNeed: string;
  recommendedAt: string;
};

export type SelectedServiceSlice = {
  jobId: RouteMapJobId;
  roadId: RouteMapRoadId;
  addedAt: string;
};

export function emptyOpeningAnswers(): OpeningAnswersSlice {
  return {
    preferredName: "",
    projectNeed: "",
    businessName: "",
    requestedDeadline: "",
    deadlineStatus: "not_requested",
    existingMaterialsNote: "",
    confirmedAt: null,
  };
}

export function readOpeningAnswers(
  draft: WorkingDraftRecord,
): OpeningAnswersSlice {
  const raw = draft.slices.discoveryAnswers;
  if (!raw || typeof raw !== "object") return emptyOpeningAnswers();
  const o = raw as Partial<OpeningAnswersSlice>;
  return {
    preferredName: typeof o.preferredName === "string" ? o.preferredName : "",
    projectNeed: typeof o.projectNeed === "string" ? o.projectNeed : "",
    businessName: typeof o.businessName === "string" ? o.businessName : "",
    requestedDeadline:
      typeof o.requestedDeadline === "string" ? o.requestedDeadline : "",
    deadlineStatus:
      o.deadlineStatus === "unconfirmed" || o.deadlineStatus === "not_requested"
        ? o.deadlineStatus
        : "not_requested",
    existingMaterialsNote:
      typeof o.existingMaterialsNote === "string"
        ? o.existingMaterialsNote
        : "",
    confirmedAt: typeof o.confirmedAt === "string" ? o.confirmedAt : null,
  };
}

export function readSelectedRoute(
  draft: WorkingDraftRecord,
): SelectedRouteSlice | null {
  const raw = draft.slices.customerSelectedRoute;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<SelectedRouteSlice>;
  if (
    o.roadId !== "i75" &&
    o.roadId !== "i20" &&
    o.roadId !== "update" &&
    o.roadId !== "random-exit" &&
    o.roadId !== "i285"
  ) {
    return null;
  }
  return {
    roadId: o.roadId,
    selectedAt:
      typeof o.selectedAt === "string" ? o.selectedAt : new Date().toISOString(),
  };
}

export function readRouteRecommendation(
  draft: WorkingDraftRecord,
): RouteRecommendationSlice | null {
  const raw = draft.slices.routeRecommendation;
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<RouteRecommendationSlice>;
  if (
    o.roadId !== "i75" &&
    o.roadId !== "i20" &&
    o.roadId !== "update" &&
    o.roadId !== "random-exit"
  ) {
    return null;
  }
  return {
    roadId: o.roadId,
    projectNeed: typeof o.projectNeed === "string" ? o.projectNeed : "",
    recommendedAt:
      typeof o.recommendedAt === "string"
        ? o.recommendedAt
        : new Date().toISOString(),
  };
}

/**
 * Route suggestion is valid only while the underlying project-need text matches.
 * Stale recommendations from a prior need must not highlight a route.
 */
export function readActiveRouteRecommendation(
  draft: WorkingDraftRecord,
  currentProjectNeed: string,
): RouteRecommendationSlice | null {
  const saved = readRouteRecommendation(draft);
  if (!saved) return null;
  const current = currentProjectNeed.trim().toLowerCase();
  const bound = saved.projectNeed.trim().toLowerCase();
  if (!current || !bound || current !== bound) return null;
  return saved;
}

export function readSelectedServices(
  draft: WorkingDraftRecord,
): SelectedServiceSlice[] {
  const raw = draft.slices.selectedServices;
  if (!Array.isArray(raw)) return [];
  const out: SelectedServiceSlice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Partial<SelectedServiceSlice>;
    if (typeof o.jobId !== "string" || typeof o.roadId !== "string") continue;
    out.push({
      jobId: o.jobId as RouteMapJobId,
      roadId: o.roadId as RouteMapRoadId,
      addedAt:
        typeof o.addedAt === "string" ? o.addedAt : new Date().toISOString(),
    });
  }
  return out;
}

export function readConversationStage(
  draft: WorkingDraftRecord,
): ConversationRoomStage {
  return (
    stageFromLocation(draft.slices.currentConversationLocation) ??
    stageFromLocation(draft.cursor.conversationLocation) ??
    "opening"
  );
}

export function withConversationStage(
  draft: WorkingDraftRecord,
  stage: ConversationRoomStage,
): WorkingDraftRecord {
  const location = stageLocation(stage);
  return {
    ...draft,
    cursor: {
      ...draft.cursor,
      conversationLocation: location,
      flowStep: stage,
    },
    slices: {
      ...draft.slices,
      currentConversationLocation: location,
    },
  };
}

export function selectedJobIdSet(
  services: readonly SelectedServiceSlice[],
): Set<RouteMapJobId> {
  return new Set(services.map((s) => s.jobId));
}
