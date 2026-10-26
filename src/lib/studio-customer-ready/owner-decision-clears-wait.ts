import { studioOwnerDecisionClearsWaitV1 as cfg } from "@/config/studio-owner-decision-clears-wait-v1";

export type OwnerDecisionClearAction =
  (typeof cfg.decisionActions)[number];

export function isOwnerDecisionClearAction(
  action: string,
): action is OwnerDecisionClearAction {
  return (cfg.decisionActions as readonly string[]).includes(action);
}

export function ownerDecisionShouldClearWait(input: {
  action: string;
  remainingOwnerFileCount: number;
  workState: string;
}): boolean {
  if (!isOwnerDecisionClearAction(input.action)) return false;
  if (input.workState !== "WAITING_ON_OWNER") return false;
  if (input.remainingOwnerFileCount > 0) return false;
  return true;
}

export function nextWorkStateAfterOwnerDecision(input: {
  action: string;
  assignedRecipient?: string;
  nextActor?: string;
}): "ACTIVE_WORK" | "WAITING_ON_SYSTEM" {
  if (input.action === "send_back") return "WAITING_ON_SYSTEM";
  if (input.action === "approve") return "ACTIVE_WORK";
  if (input.action === "reject") return "ACTIVE_WORK";
  const who = `${input.nextActor ?? ""} ${input.assignedRecipient ?? ""}`.toLowerCase();
  if (who.includes("production")) return "WAITING_ON_SYSTEM";
  return "ACTIVE_WORK";
}
