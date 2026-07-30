/**
 * C8d — pure URL / stage mapping for the unified Review / Final / Delivery room.
 * 7A stage ids inform navigation; Honest Final Files remains file authority.
 */

import {
  c8dUnifiedRoomStateV1,
  type UnifiedRoomStateId,
  UNIFIED_ROOM_STATE_IDS,
} from "@/config/c8d-unified-room-state-v1";
import type { ReviewDeliveryStageId } from "@/config/review-delivery-stage-v1";
import { studioBoard } from "@/config/studio-board";

export function isUnifiedRoomStateId(value: string | null | undefined): value is UnifiedRoomStateId {
  return Boolean(value && (UNIFIED_ROOM_STATE_IDS as readonly string[]).includes(value));
}

export function parseUnifiedRoomStateParam(
  value: string | null | undefined,
): UnifiedRoomStateId | null {
  if (!isUnifiedRoomStateId(value)) return null;
  return value;
}

/** Map a 7A job stage to the in-room state a customer should open. */
export function roomStateForReviewDeliveryStage(
  stageId: ReviewDeliveryStageId | string,
): UnifiedRoomStateId | null {
  if (stageId === "approved-for-final-delivery") return "final";
  if (stageId === "final-delivery") return "delivery";
  if (
    stageId === "work-ready-for-review" ||
    stageId === "customer-reviewing" ||
    stageId === "revised-work-ready"
  ) {
    return "review";
  }
  return null;
}

export function buildUnifiedRoomHref(options: {
  roomState: UnifiedRoomStateId;
  jobId?: string | null;
  extraParams?: URLSearchParams | Record<string, string | undefined | null>;
}): string {
  const params = new URLSearchParams();
  if (options.roomState !== "review") {
    params.set(c8dUnifiedRoomStateV1.queryKey, options.roomState);
  }
  if (options.jobId) {
    params.set("jobId", options.jobId);
  }
  if (options.extraParams) {
    const entries =
      options.extraParams instanceof URLSearchParams
        ? [...options.extraParams.entries()]
        : Object.entries(options.extraParams);
    for (const [key, value] of entries) {
      if (key === c8dUnifiedRoomStateV1.queryKey || key === "jobId") continue;
      if (value == null || value === "") continue;
      params.set(key, value);
    }
  }
  const query = params.toString();
  const base = studioBoard.routes.feedbackStudio;
  return query ? `${base}?${query}` : base;
}

/** Compatibility target for legacy `/deliverables` bookmarks and Board links. */
export function buildDeliverablesCompatibilityRedirectPath(
  incoming: URLSearchParams | Record<string, string | string[] | undefined>,
): string {
  const source =
    incoming instanceof URLSearchParams
      ? incoming
      : (() => {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(incoming)) {
            if (typeof value === "string") params.set(key, value);
            else if (Array.isArray(value) && typeof value[0] === "string") {
              params.set(key, value[0]);
            }
          }
          return params;
        })();

  return buildUnifiedRoomHref({
    roomState: "delivery",
    jobId: source.get("jobId"),
    extraParams: source,
  });
}
