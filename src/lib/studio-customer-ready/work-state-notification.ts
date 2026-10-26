import { studioWorkStateNotificationV1 as protocol } from "@/config/studio-work-state-notification-v1";
import type { StudioNotifiedWorkState } from "@/config/studio-work-state-notification-v1";

export type WorkStateNotifyKind =
  | "none"
  | "visible_resume"
  | "slice_complete"
  | "yellow_system"
  | "idle_alert"
  | "stalled_audible"
  | "stopped_alert"
  | "owner_red_audible";

export function workStateLabel(state: StudioNotifiedWorkState): string {
  if (state === "ACTIVE_WORK") return "ACTIVE WORK";
  if (state === "WAITING_ON_OWNER") return "WAITING ON OWNER";
  if (state === "WAITING_ON_SYSTEM") return "WAITING ON SYSTEM";
  if (state === "STALLED_HUNG") return "STALLED / HUNG";
  if (state === "STOPPED") return "STOPPED";
  return "IDLE";
}

export function canEnterIdle(safeAuthorizedWorkRemains: boolean): boolean {
  return protocol.idleForbiddenWhenSafeWorkRemains
    ? !safeAuthorizedWorkRemains
    : true;
}

export function isTelemetryMaintenanceTask(task: string | null | undefined): boolean {
  const hay = String(task ?? "").toLowerCase();
  if (!hay) return false;
  return protocol.forbiddenActiveTaskPatterns.some((pattern) =>
    hay.includes(pattern),
  );
}

export function isLeaveActive(
  previous: StudioNotifiedWorkState | null,
  next: StudioNotifiedWorkState,
): boolean {
  return previous === "ACTIVE_WORK" && next !== "ACTIVE_WORK";
}

export function notifyKindForTransition(
  previous: StudioNotifiedWorkState | null,
  next: StudioNotifiedWorkState,
): WorkStateNotifyKind {
  if (previous === next) return "none";
  if (next === "ACTIVE_WORK") {
    return previous && previous !== "ACTIVE_WORK" ? "visible_resume" : "none";
  }
  if (next === "WAITING_ON_OWNER") return "owner_red_audible";
  if (next === "WAITING_ON_SYSTEM") return "yellow_system";
  if (next === "STALLED_HUNG") return "stalled_audible";
  if (next === "STOPPED") return "stopped_alert";
  return "idle_alert";
}

export function shouldNotifyImmediately(
  previous: StudioNotifiedWorkState | null,
  next: StudioNotifiedWorkState,
  kindOverride?: WorkStateNotifyKind,
): boolean {
  const kind = kindOverride ?? notifyKindForTransition(previous, next);
  return kind !== "none";
}

export function shouldPlayAudibleWorkAlert(kind: WorkStateNotifyKind): boolean {
  return (
    kind === "owner_red_audible" ||
    kind === "stalled_audible" ||
    kind === "slice_complete"
  );
}

export function isLoudOwnerRed(kind: WorkStateNotifyKind): boolean {
  return kind === "owner_red_audible";
}

export type StudioAttentionState = "GREEN" | "YELLOW" | "RED";

export function attentionBadgeLabel(state: StudioAttentionState): string {
  if (state === "GREEN") return "GREEN — CONTINUE";
  if (state === "YELLOW") return "YELLOW — WATCH";
  return "RED — OWNER ACTION REQUIRED NOW";
}

export function shouldKeepHeartbeatMoving(
  workState: StudioNotifiedWorkState,
  _attention: StudioAttentionState,
): boolean {
  return workState === "ACTIVE_WORK";
}

export function shouldShowBlockingWatchPage(
  attention: StudioAttentionState,
  acknowledged: boolean,
): boolean {
  if (attention !== "YELLOW") return false;
  return !acknowledged && !protocol.yellowDoesNotReplaceHeartbeat;
}

export function shouldShowRedInterrupt(
  attention: StudioAttentionState,
  acknowledged: boolean,
): boolean {
  return attention === "RED" && !acknowledged && protocol.redInterruptUntilAcknowledged;
}

export function liveScreenAfterAttentionAck(): "heartbeat" {
  return "heartbeat";
}

export function resolveAttentionForWorkState(input: {
  workState: StudioNotifiedWorkState;
  previousAttention?: StudioAttentionState | null;
  explicitAttention?: StudioAttentionState | null;
  keepRedInterrupt?: boolean;
}): StudioAttentionState {
  if (input.explicitAttention) return input.explicitAttention;
  if (input.workState === "WAITING_ON_OWNER") return "RED";
  if (input.workState === "STOPPED") return "GREEN";
  if (input.workState === "STALLED_HUNG" || input.workState === "IDLE") {
    return "RED";
  }
  if (input.workState === "ACTIVE_WORK") {
    if (input.previousAttention === "RED" && !input.keepRedInterrupt) {
      return "YELLOW";
    }
    if (input.previousAttention === "YELLOW") return "YELLOW";
    return input.previousAttention ?? "GREEN";
  }
  return "YELLOW";
}
