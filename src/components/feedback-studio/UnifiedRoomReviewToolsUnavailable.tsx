"use client";

import { C8D_ROOM_STATE_COPY, type UnifiedRoomStateId } from "@/config/c8d-unified-room-state-v1";

type Props = {
  roomState: Extract<UnifiedRoomStateId, "final" | "delivery">;
};

/** C8d — REVIEW TOOLS stays labeled; actions are unavailable outside Review. */
export default function UnifiedRoomReviewToolsUnavailable({ roomState }: Props) {
  const message =
    roomState === "final"
      ? C8D_ROOM_STATE_COPY.final.toolsUnavailable
      : C8D_ROOM_STATE_COPY.delivery.toolsUnavailable;

  return (
    <aside className="fs-feedback-panel" aria-label={C8D_ROOM_STATE_COPY.reviewToolsTitle}>
      <div className="fs-feedback-panel__head">
        <h2 className="fs-feedback-panel__title">{C8D_ROOM_STATE_COPY.reviewToolsTitle}</h2>
      </div>
      <p className="fs-feedback-panel__lead">{message}</p>
    </aside>
  );
}
