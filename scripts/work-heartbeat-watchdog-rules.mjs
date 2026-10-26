/**
 * Watchdog stall rule.
 * Silence after an intentional STOP / listening handoff is not a stall.
 * Stall only when monitoring is ON, Scout was expected to continue,
 * and the ACTIVE pulse died. Refresh must not invent a stall.
 */

export const WATCHDOG_STALE_MS = 600_000;

export function isWatchdogMonitoringOn(record) {
  if (!record) return true;
  return record.watchdogMonitoring !== false;
}

export function isAlarmMuted(record) {
  return Boolean(record?.alarmMuted);
}

export function isScoutListeningHandoff(record) {
  if (!record) return false;
  return Boolean(
    record.scoutListening ||
      record.intentionalStop ||
      record.expectedToContinue === false,
  );
}

/** Package STOP from pulse. Chat hooks must not remap this to ACTIVE. */
export function isIntentionalPackageStop(record) {
  if (!record) return false;
  return (
    record.workState === "STOPPED" &&
    (record.intentionalStop === true || record.expectedToContinue === false)
  );
}

/** Owner wait / system wait / idle / STOP. A chat message is not package work. */
export function isProtectedNonWorkingState(record) {
  const state = record?.workState;
  return (
    state === "STOPPED" ||
    state === "WAITING_ON_OWNER" ||
    state === "WAITING_ON_SYSTEM" ||
    state === "IDLE"
  );
}

export function shouldDeclareWatchdogStall(record, nowMs = Date.now()) {
  if (!record) return false;
  if (!isWatchdogMonitoringOn(record)) return false;
  if (isScoutListeningHandoff(record)) return false;
  if (record.workState !== "ACTIVE_WORK") return false;
  // A quiet or stale pulse is UNKNOWN, not Scout-in-trouble.
  // Trouble requires an independent failure already recorded.
  if (record.scoutTrouble !== true) return false;
  const last = Date.parse(record.executionEvidenceAt || record.lastActivityAt || "");
  if (!Number.isFinite(last)) return false;
  return nowMs - last >= WATCHDOG_STALE_MS;
}

export function shouldPlayWatchdogAudible(record, nowMs = Date.now()) {
  if (!record) return false;
  if (!isWatchdogMonitoringOn(record)) return false;
  if (isAlarmMuted(record)) return false;
  if (isScoutListeningHandoff(record)) return false;
  if (shouldDeclareWatchdogStall(record, nowMs)) return true;
  return (
    record.workState === "STALLED_HUNG" &&
    record.expectedToContinue !== false
  );
}

/** Read-only. Never writes. Never invents trouble. */
export function refreshDisplayedWorkState(record, nowMs = Date.now()) {
  return resolveDisplayedWorkState(record, nowMs);
}

/**
 * A typed message is not execution and must not leave a hold or set WORKING.
 */
export function applyScoutWorkingStance(record) {
  if (!record) return record;
  return record;
}

/**
 * A thought is not tool-run evidence. It does not refresh WORKING.
 */
export function applyScoutProgressPulse(record) {
  if (!record) return record;
  return record;
}

export function isActivityHold(record) {
  if (!record) return false;
  if (record.intentionalStop === true) return true;
  return (
    record.workState === "STOPPED" ||
    record.workState === "WAITING_ON_OWNER" ||
    record.workState === "WAITING_ON_SYSTEM" ||
    record.workState === "IDLE"
  );
}

export function assignmentLabelFromHook(payload) {
  if (!payload || typeof payload !== "object") return "";
  const explicit = payload.assignment || payload.assignmentId || payload.taskId;
  if (typeof explicit === "string" && explicit.trim() && explicit.trim().length <= 120) {
    return explicit.trim();
  }
  const raw = payload.prompt || payload.user_prompt || payload.text || payload.message || "";
  const line = String(raw)
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find(Boolean);
  if (!line) return "";
  const cleaned = line.replace(/^#+\s*/, "").trim();
  if (!cleaned || cleaned.length > 120) return "";
  return cleaned;
}

function executionAssignmentFor(record, payload) {
  const incoming = assignmentLabelFromHook(payload);
  if (incoming) return incoming;
  const pending = typeof record.pendingAssignment === "string" ? record.pendingAssignment.trim() : "";
  if (pending) return pending;
  const open = Number(record.activeExecutionCount) || 0;
  if (open > 0 && typeof record.executionAssignment === "string" && record.executionAssignment.trim()) {
    return record.executionAssignment.trim();
  }
  if (typeof record.packageId === "string" && record.packageId.trim()) return record.packageId.trim();
  return "Assignment not identified";
}

export function applyScoutMessage(record, payload) {
  if (!record) return record;
  if (isActivityHold(record) || isProtectedNonWorkingState(record)) return record;
  if (record.workState !== "ACTIVE_WORK") return record;
  const label = assignmentLabelFromHook(payload);
  if (!label) return record;
  return { ...record, pendingAssignment: label };
}

export function applyScoutToolStart(record, payload, nowIso = new Date().toISOString()) {
  if (!record) return record;
  if (isActivityHold(record) || isProtectedNonWorkingState(record)) return record;
  if (record.workState !== "ACTIVE_WORK") return record;
  const count = (Number(record.activeExecutionCount) || 0) + 1;
  const assignment = executionAssignmentFor(record, payload);
  return {
    ...record,
    activeExecutionCount: count,
    activityTruth: "WORKING",
    executionAssignment: assignment,
    executionEvidenceAt: nowIso,
    lastActivityAt: nowIso,
    currentTask: assignment,
    pendingAssignment: "",
    scoutListening: false,
    scoutTrouble: false,
    executionFailure: count > 1 ? record.executionFailure || null : null,
    lastMeaningfulAction: "Tool execution",
  };
}

export function applyScoutToolFinish(record, _payload, nowIso = new Date().toISOString()) {
  if (!record) return record;
  if (isActivityHold(record) || isProtectedNonWorkingState(record)) return record;
  const count = Math.max(0, (Number(record.activeExecutionCount) || 0) - 1);
  return {
    ...record,
    activeExecutionCount: count,
    executionEvidenceAt: nowIso,
    lastActivityAt: nowIso,
    activityTruth:
      count > 0
        ? "WORKING"
        : record.activityTruth === "FAILED" || record.activityTruth === "INTERRUPTED"
          ? record.activityTruth
          : "WORKING",
  };
}

export function applyScoutToolFailure(record, payload, nowIso = new Date().toISOString()) {
  if (!record) return record;
  if (isActivityHold(record) || isProtectedNonWorkingState(record)) return record;
  const count = Math.max(0, (Number(record.activeExecutionCount) || 0) - 1);
  const reason = String(
    payload?.error || payload?.message || payload?.failure_type || "Tool failed",
  ).slice(0, 180);
  return {
    ...record,
    activeExecutionCount: count,
    executionEvidenceAt: nowIso,
    lastActivityAt: nowIso,
    executionFailure: reason,
    activityTruth: count > 0 ? "WORKING" : "FAILED",
    scoutTrouble: false,
  };
}

export function applyScoutExecutionStop(record, payload, nowIso = new Date().toISOString()) {
  if (!record) return record;
  if (isActivityHold(record) || isProtectedNonWorkingState(record)) return record;
  const count = Number(record.activeExecutionCount) || 0;
  if (count > 0) return record;
  const status = String(payload?.status || payload?.reason || payload?.stop_reason || "").toLowerCase();
  const interrupted = /abort|interrupt|cancel|error|fail/.test(status);
  const completed = record.executionAssignment || "";
  if (interrupted) {
    return {
      ...record,
      activityTruth: "INTERRUPTED",
      executionCompletedAt: nowIso,
      executionEvidenceAt: nowIso,
      scoutListening: false,
      scoutTrouble: false,
      currentTask: "",
      lastCompletedAssignment: completed,
      lastMeaningfulAction: "Execution interrupted",
    };
  }
  return {
    ...record,
    activityTruth: "LISTENING",
    executionCompletedAt: nowIso,
    executionEvidenceAt: nowIso,
    scoutListening: true,
    expectedToContinue: false,
    intentionalStop: false,
    currentTask: "",
    lastCompletedAssignment: completed,
    lastMeaningfulAction: "Execution finished",
  };
}

export function resolveActivityTruth(record, nowMs = Date.now()) {
  if (!record) return "UNKNOWN";
  if (record.workState === "STOPPED" || record.intentionalStop === true) return "STOPPED";
  if (record.workState === "WAITING_ON_OWNER") return "WAITING_ON_OWNER";
  if (record.workState === "WAITING_ON_SYSTEM") return "WAITING_ON_SYSTEM";
  if (record.workState === "IDLE") return "IDLE";
  if (record.scoutTrouble === true) return "TROUBLE";
  const count = Number(record.activeExecutionCount) || 0;
  const evidenceAt = Date.parse(record.executionEvidenceAt || "");
  const fresh = Number.isFinite(evidenceAt) && nowMs - evidenceAt < WATCHDOG_STALE_MS;
  const recorded = record.activityTruth || "";
  if ((recorded === "FAILED" || recorded === "INTERRUPTED") && count === 0) return recorded;
  if (count > 0 && fresh) return "WORKING";
  if (count > 0 && !fresh) return "UNKNOWN";
  if (recorded === "WORKING" && fresh) return "WORKING";
  if (recorded === "LISTENING") return "LISTENING";
  return "UNKNOWN";
}

export function resolveDisplayedWorkState(record, nowMs = Date.now()) {
  if (!record) return null;
  const recorded = record.workState ?? null;
  if (isScoutListeningHandoff(record)) {
    return recorded === "STALLED_HUNG" ? "ACTIVE_WORK" : recorded;
  }
  if (recorded === "ACTIVE_WORK" && shouldDeclareWatchdogStall(record, nowMs)) {
    return "STALLED_HUNG";
  }
  return recorded;
}
