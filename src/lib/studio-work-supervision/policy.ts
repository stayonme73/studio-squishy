import type { IncidentSeverity, ProviderPortStatus } from "./types";

export const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
export const DEFAULT_GRACE_MS = 5_000;
export const ROUTINE_RECOVERY_WINDOW_MS = 30_000;
export const LIVE_SWEEP_INTERVAL_MS = 30_000;
export const AUTHORIZED_ROUTINE_RECOVERY_STRATEGY = "request_fresh_heartbeat" as const;

/** Next-check cadence after evaluation or escalation. */
export const NEXT_CHECK_INTERVAL_MS: Record<IncidentSeverity, number> = {
  ROUTINE: 5 * 60_000,
  CUSTOMER_DELAY_RISK: 15 * 60_000,
  DEADLINE_CRITICAL: 5 * 60_000,
  FINANCIAL_RISK: 10 * 60_000,
  RIGHTS_OR_COMPLIANCE_RISK: 15 * 60_000,
  SECURITY_SUSPECTED: 2 * 60_000,
  SECURITY_CONFIRMED: 2 * 60_000,
};

export const SQUISHY_WATCHKEEPER_PUBLIC_PATH =
  "/squishy/squishy-studio-guide-v1.png" as const;

export const SQUISHY_WATCHKEEPER_ASSET =
  "public/squishy/squishy-studio-guide-v1.png" as const;

export const UNCONNECTED_PROVIDER_PORTS: readonly ProviderPortStatus[] = [
  {
    id: "claude",
    label: "Claude verifier",
    status: "NOT_CONNECTED",
    healthyDisplayAllowed: false,
  },
  {
    id: "build_a_bot",
    label: "Build-A-Bot automation",
    status: "NOT_CONNECTED",
    healthyDisplayAllowed: false,
  },
  {
    id: "make",
    label: "Make.com",
    status: "NOT_CONNECTED",
    healthyDisplayAllowed: false,
  },
  {
    id: "resend",
    label: "Resend out-of-band alert",
    status: "NOT_CONNECTED",
    healthyDisplayAllowed: false,
  },
] as const;

export function nextCheckAt(now: Date, severity: IncidentSeverity): string {
  return new Date(now.getTime() + NEXT_CHECK_INTERVAL_MS[severity]).toISOString();
}

export function isSecuritySeverity(severity: IncidentSeverity): boolean {
  return severity === "SECURITY_SUSPECTED" || severity === "SECURITY_CONFIRMED";
}

export function mayShowSquishy(severity: IncidentSeverity): boolean {
  return severity === "ROUTINE" && !isSecuritySeverity(severity);
}

export function ifOwnerDoesNothingCopy(
  severity: IncidentSeverity,
  nextAt: string,
  ownerEscalated = false,
): string {
  if (isSecuritySeverity(severity)) {
    return `Containment stays in place. The Machine rechecks at ${nextAt}. This stays on the Owner desk until Tagia acts or confirms resolution.`;
  }
  if (severity === "ROUTINE" && !ownerEscalated) {
    return `The Machine retries recovery at ${nextAt}. Tagia is not paged for routine recovery.`;
  }
  return `The Machine keeps the incident on the Owner desk and rechecks at ${nextAt}. Customer impact does not clear by silence.`;
}

export function ownerMustBeInterrupted(input: {
  severity: IncidentSeverity;
  recoveryFailed: boolean;
  ownerJudgmentRequired: boolean;
}): boolean {
  const { severity, recoveryFailed, ownerJudgmentRequired } = input;
  if (isSecuritySeverity(severity)) return true;
  if (severity === "FINANCIAL_RISK") return true;
  if (severity === "DEADLINE_CRITICAL") return true;
  if (severity === "RIGHTS_OR_COMPLIANCE_RISK" && ownerJudgmentRequired) {
    return true;
  }
  if (severity === "CUSTOMER_DELAY_RISK" && (recoveryFailed || ownerJudgmentRequired)) {
    return true;
  }
  if (severity === "ROUTINE" && recoveryFailed) return true;
  return false;
}

export function isUnconnectedProviderId(id: string | null | undefined): boolean {
  return id === "claude" || id === "build_a_bot" || id === "make" || id === "resend";
}

export function routineRecoveryAuthorized(input: {
  severity: IncidentSeverity;
  category: string;
}): boolean {
  if (isSecuritySeverity(input.severity)) return false;
  if (input.severity === "FINANCIAL_RISK") return false;
  if (input.severity === "DEADLINE_CRITICAL") return false;
  if (input.severity === "RIGHTS_OR_COMPLIANCE_RISK") return false;
  if (input.category === "provider") return false;
  return input.severity === "ROUTINE";
}
