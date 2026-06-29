import type { TaskPhase } from "./types";

/** Universal QA checks — required on every family panel before phase-specific additions. */
export const UNIVERSAL_QA_CHECKS = [
  "scope_match",
  "factual_accuracy",
  "direction_match",
  "usability",
  "client_safe_packaging",
] as const;

/** Phase-specific checklist item ids — appended after universal checks. */
export const QA_CHECKLIST_BY_PHASE: Record<TaskPhase, readonly string[]> = {
  strategy: ["strategy_alignment", "scope_clarity"],
  strategy_content_direction: ["direction_alignment", "brand_fit"],
  review_strategy: ["review_complete", "recommendations_clear"],
  copy: ["copy_accuracy", "brand_voice", "grammar"],
  creative: ["visual_quality", "brand_alignment", "specs_met"],
  creative_copy: ["copy_accuracy", "visual_quality", "brand_alignment"],
  creative_production: ["production_quality", "specs_met", "deliverable_complete"],
  qa: ["production_complete", "deliverable_specs", "client_requirements"],
  delivery_prep: ["package_complete", "fingerprint_match", "no_internal_leaks"],
};

export function requiredChecksForPhase(phase: TaskPhase): readonly string[] {
  const phaseChecks = QA_CHECKLIST_BY_PHASE[phase] ?? [];
  return [...UNIVERSAL_QA_CHECKS, ...phaseChecks];
}

export function validateChecklistForPhase(
  phase: TaskPhase,
  checks: readonly string[] | undefined,
): { ok: true } | { ok: false; error: string } {
  const required = requiredChecksForPhase(phase);
  if (required.length === 0) {
    return { ok: true };
  }
  if (!checks || checks.length === 0) {
    return { ok: false, error: "QA checklist is required." };
  }
  const submitted = new Set(checks);
  const missing = required.filter((item) => !submitted.has(item));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Missing required checklist items: ${missing.join(", ")}.`,
    };
  }
  return { ok: true };
}
