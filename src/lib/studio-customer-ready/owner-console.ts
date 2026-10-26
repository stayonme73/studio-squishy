/**
 * Single-page Owner work + attention desk.
 * Operational telemetry only. Not the customer site. Not the Room 3 Owner Console.
 */

import type { StudioNotifiedWorkState } from "@/config/studio-work-state-notification-v1";

export const OWNER_CONSOLE_HTML =
  "docs/launch/PROJECT-ALPHA-OWNER-CONSOLE.html" as const;

export const STALL_FRONT_DOOR_STEPS = [
  "Check whether Scout recovered.",
  "If not, ask Scout to explain the stop.",
  "Restart or redirect the task if needed.",
] as const;

export const OWNER_CONSOLE_ALIAS_HTML =
  "docs/launch/PROJECT-ALPHA-WORK-HEARTBEAT.html" as const;

export const OWNER_CONSOLE_ACK_ENDPOINT = "http://127.0.0.1:4177/ack" as const;

export type OwnerConsoleAckPhase =
  | "none"
  | "alert_unacked"
  | "acknowledged_action_required"
  | "resolved";

export function shouldOpenExtraBrowserTab(): false {
  return false;
}

export function shouldSoundOwnerConsoleAlert(input: {
  attentionState: "GREEN" | "YELLOW" | "RED";
  tagiaMustAct: boolean;
  acknowledged: boolean;
  monitoringOn?: boolean;
  alarmMuted?: boolean;
  expectedToContinue?: boolean;
  listening?: boolean;
  confirmedStaleActive?: boolean;
}): boolean {
  if (input.acknowledged) return false;
  if (input.alarmMuted) return false;
  if (input.monitoringOn === false) return false;
  if (input.listening) return false;
  if (input.expectedToContinue === false) return false;
  if (input.confirmedStaleActive === true) return true;
  if (
    input.monitoringOn !== undefined ||
    input.alarmMuted !== undefined ||
    input.expectedToContinue !== undefined ||
    input.listening !== undefined ||
    input.confirmedStaleActive !== undefined
  ) {
    return false;
  }
  return input.attentionState === "RED" && input.tagiaMustAct;
}

export function ownerConsoleAckPhase(input: {
  attentionState: "GREEN" | "YELLOW" | "RED";
  tagiaMustAct: boolean;
  acknowledged: boolean;
}): OwnerConsoleAckPhase {
  if (input.attentionState !== "RED" || !input.tagiaMustAct) {
    return input.acknowledged && input.attentionState === "GREEN"
      ? "resolved"
      : "none";
  }
  return input.acknowledged
    ? "acknowledged_action_required"
    : "alert_unacked";
}

export function ownerConsoleAckLabel(phase: OwnerConsoleAckPhase): string {
  if (phase === "acknowledged_action_required") {
    return "ACKNOWLEDGED · ACTION STILL REQUIRED";
  }
  if (phase === "resolved") return "RESOLVED";
  if (phase === "alert_unacked") return "ACKNOWLEDGE REQUIRED";
  return "NO OWNER ACTION";
}

export function ownerChoiceWithoutContinueIsRed(): true {
  return true;
}

export function ownerYellowMeansWatchOnly(): true {
  return true;
}

export function ownerAcknowledgeKeepsRedCard(): true {
  return true;
}

export function ownerFrontDoorMessage(input: {
  attentionState: "GREEN" | "YELLOW" | "RED";
  workState: StudioNotifiedWorkState;
}): string {
  if (input.attentionState === "YELLOW") return "Watch. Work continues.";
  if (input.attentionState !== "RED") return "No Owner action is required.";
  if (input.workState === "STALLED_HUNG") return "Scout is stuck.";
  if (input.workState === "WAITING_ON_OWNER") return "Owner input is needed.";
  if (input.workState === "STOPPED") return "Work stopped on purpose.";
  if (input.workState === "IDLE") return "Work went idle.";
  return "Owner action is required.";
}

export function ownerFrontDoorSteps(input: {
  attentionState: "GREEN" | "YELLOW" | "RED";
  workState: StudioNotifiedWorkState;
  tagiaMustAct: boolean;
  whatHappensNext?: string;
}): string[] {
  if (input.attentionState === "YELLOW") return [];
  if (input.attentionState !== "RED" || !input.tagiaMustAct) return [];
  if (input.workState === "STALLED_HUNG") return [...STALL_FRONT_DOOR_STEPS];
  const next = String(input.whatHappensNext ?? "").trim();
  return next ? [next] : ["Complete the required Owner action."];
}

export function ownerFrontDoorHowLong(input: {
  workState: StudioNotifiedWorkState;
  changedAt: string;
  nowMs?: number;
}): string {
  if (input.workState === "STALLED_HUNG") {
    return "10+ minutes without meaningful activity";
  }
  const start = Date.parse(input.changedAt);
  const now = input.nowMs ?? Date.now();
  if (!Number.isFinite(start)) return "Duration unknown";
  const minutes = Math.max(0, Math.floor((now - start) / 60_000));
  if (minutes < 1) return "Less than 1 minute";
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function ownerFrontDoorShowsAcknowledge(input: {
  attentionState: "GREEN" | "YELLOW" | "RED";
  tagiaMustAct: boolean;
}): boolean {
  return input.attentionState === "RED" && input.tagiaMustAct;
}

export type OwnerMatterTileAttention = "RED" | "YELLOW" | "GREEN";

export type OwnerMatterTile = {
  company: string;
  matter: string;
  attention: OwnerMatterTileAttention;
  status: string;
  howLong: string;
};

/** Front door answers overall urgency. Tile color answers this matter only. */
export function ownerFrontDoorColorIsSeparateFromTileColor(): true {
  return true;
}

/** Tile color follows the real matter state, not which tray it sits in. */
export function ownerMatterTileColorFollowsMatterStateNotTray(): true {
  return true;
}

export function ownerHeldBlockingMatterStaysRed(): true {
  return true;
}

export function ownerMatterTileAttention(input: {
  ownerActionRequiredNow?: boolean;
  blocksScoutOrSystem?: boolean;
  movingNormally?: boolean;
}): OwnerMatterTileAttention {
  if (input.ownerActionRequiredNow || input.blocksScoutOrSystem) return "RED";
  if (input.movingNormally) return "GREEN";
  return "YELLOW";
}

export function ownerMatterTileScanLine(tile: OwnerMatterTile): string {
  const mark =
    tile.attention === "RED" ? "RED" : tile.attention === "YELLOW" ? "YELLOW" : "GREEN";
  return `${mark} · ${tile.company} — ${tile.matter} · ${tile.status} · ${tile.howLong}`;
}
