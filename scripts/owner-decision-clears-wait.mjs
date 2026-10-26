/**
 * Machine rule: a valid Owner decision clears WAITING ON OWNER
 * when no other Owner-action files remain.
 * Defect: OWNER-SEND-LEAVES-STALE-WAITING-ON-OWNER
 */
const DECISION_ACTIONS = new Set(["send", "approve", "reject", "send_back"]);

export function remainingOwnerFileCount(state) {
  return (state?.matters ?? []).filter(
    (matter) =>
      matter.tray === "ACTION_REQUIRED" || matter.tray === "WAITING_ON_MY_DECISION",
  ).length;
}

export function ownerDecisionShouldClearWait(input) {
  if (!DECISION_ACTIONS.has(input.action)) return false;
  if (input.workState !== "WAITING_ON_OWNER") return false;
  if (input.remainingOwnerFileCount > 0) return false;
  return true;
}

export function nextWorkStateAfterOwnerDecision(input) {
  if (input.action === "send_back") return "WAITING_ON_SYSTEM";
  if (input.action === "approve") return "ACTIVE_WORK";
  if (input.action === "reject") return "ACTIVE_WORK";
  const who = `${input.nextActor ?? ""} ${input.assignedRecipient ?? ""}`.toLowerCase();
  if (who.includes("production")) return "WAITING_ON_SYSTEM";
  return "ACTIVE_WORK";
}
